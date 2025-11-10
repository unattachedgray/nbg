#include "pch.h"
#include "EngineModule.h"
#include <sstream>
#include <winrt/Windows.ApplicationModel.h>
#include <winrt/Windows.Storage.h>

// Windows API constants for UWP compatibility
#ifndef HANDLE_FLAG_INHERIT
#define HANDLE_FLAG_INHERIT 0x00000001
#endif

#ifndef STARTF_USESTDHANDLES
#define STARTF_USESTDHANDLES 0x00000100
#endif

#ifndef STARTF_USESHOWWINDOW
#define STARTF_USESHOWWINDOW 0x00000001
#endif

#ifndef CREATE_NO_WINDOW
#define CREATE_NO_WINDOW 0x08000000
#endif

namespace ChessApp
{
    /// <summary>
    /// Spawn the chess engine process with redirected stdin/stdout
    /// </summary>
    void EngineModule::SpawnEngine(std::wstring enginePath, ReactPromise<bool> promise) noexcept
    {
        try
        {
            std::lock_guard<std::mutex> lock(m_mutex);

            // Get package install location (where the app is installed)
            auto package = winrt::Windows::ApplicationModel::Package::Current();
            auto installedLocation = package.InstalledLocation();
            winrt::hstring pathHstring = installedLocation.Path();
            std::wstring packagePath(pathHstring.c_str());

            // Extract just the filename from the provided path
            size_t lastSlash = enginePath.find_last_of(L"\\/");
            std::wstring filename = (lastSlash != std::wstring::npos)
                ? enginePath.substr(lastSlash + 1)
                : enginePath;

            // Build path to engine in package: PackageRoot\Assets\engines\filename
            std::wstring packageEnginePath = packagePath + L"\\Assets\\engines\\" + filename;

            std::wstringstream debugMsg;
            debugMsg << L"Looking for engine at: " << packageEnginePath;
            OutputDebugStringW(debugMsg.str().c_str());

            // Check if file exists in package
            DWORD fileAttr = GetFileAttributesW(packageEnginePath.c_str());
            if (fileAttr == INVALID_FILE_ATTRIBUTES)
            {
                DWORD errorCode = GetLastError();
                std::stringstream errorMsg;
                errorMsg << "Engine not found in package. Error code: " << errorCode;
                std::string errorStr = errorMsg.str();
                promise.Reject(errorStr.c_str());
                return;
            }

            // Copy engine to temp folder (UWP restriction workaround)
            std::wstring tempEnginePath = CopyEngineToAppData(packageEnginePath);
            if (tempEnginePath.empty())
            {
                promise.Reject("Failed to copy engine to temp folder");
                return;
            }

            // If already running, stop first
            if (m_isRunning)
            {
                CleanupProcess();
            }

            // Create the engine process using the temp copy
            if (!CreateEngineProcess(tempEnginePath))
            {
                DWORD errorCode = GetLastError();
                std::stringstream errorMsg;
                errorMsg << "Failed to spawn engine process. Error code: " << errorCode;
                std::string errorStr = errorMsg.str();
                promise.Reject(errorStr.c_str());
                return;
            }

            m_isRunning = true;

            // Start output reader thread
            m_outputThread = std::thread(&EngineModule::OutputReaderThread, this);

            promise.Resolve(true);
        }
        catch (const std::exception& ex)
        {
            promise.Reject(ex.what());
        }
    }

    /// <summary>
    /// Send command to engine via stdin
    /// </summary>
    void EngineModule::SendCommand(std::string command, ReactPromise<bool> promise) noexcept
    {
        try
        {
            std::lock_guard<std::mutex> lock(m_mutex);

            if (!m_isRunning || m_stdinWrite == nullptr)
            {
                promise.Reject("Engine is not running");
                return;
            }

            // Add newline if not present
            if (!command.empty() && command.back() != '\n')
            {
                command += '\n';
            }

            DWORD bytesWritten;
            if (!WriteFile(m_stdinWrite, command.c_str(), (DWORD)command.length(), &bytesWritten, nullptr))
            {
                promise.Reject("Failed to write to engine stdin");
                return;
            }

            // Flush the pipe
            FlushFileBuffers(m_stdinWrite);

            promise.Resolve(true);
        }
        catch (const std::exception& ex)
        {
            promise.Reject(ex.what());
        }
    }

    /// <summary>
    /// Read available output from engine (non-blocking)
    /// </summary>
    void EngineModule::ReadOutput(ReactPromise<std::string> promise) noexcept
    {
        try
        {
            std::lock_guard<std::mutex> lock(m_queueMutex);

            if (m_outputQueue.empty())
            {
                promise.Resolve("");
                return;
            }

            // Get all queued output
            std::stringstream ss;
            while (!m_outputQueue.empty())
            {
                ss << m_outputQueue.front();
                m_outputQueue.pop();
            }

            promise.Resolve(ss.str());
        }
        catch (const std::exception& ex)
        {
            promise.Reject(ex.what());
        }
    }

    /// <summary>
    /// Stop the engine process
    /// </summary>
    void EngineModule::StopEngine(ReactPromise<bool> promise) noexcept
    {
        try
        {
            std::lock_guard<std::mutex> lock(m_mutex);
            CleanupProcess();
            promise.Resolve(true);
        }
        catch (const std::exception& ex)
        {
            promise.Reject(ex.what());
        }
    }

    /// <summary>
    /// Check if engine is running
    /// </summary>
    void EngineModule::IsEngineRunning(ReactPromise<bool> promise) noexcept
    {
        promise.Resolve(m_isRunning);
    }

    /// <summary>
    /// Create the engine process with redirected pipes
    /// </summary>
    bool EngineModule::CreateEngineProcess(const std::wstring& enginePath)
    {
        SECURITY_ATTRIBUTES sa;
        sa.nLength = sizeof(SECURITY_ATTRIBUTES);
        sa.bInheritHandle = TRUE;
        sa.lpSecurityDescriptor = nullptr;

        // Create pipes for stdin
        HANDLE stdinRead = nullptr;
        if (!CreatePipe(&stdinRead, &m_stdinWrite, &sa, 0))
        {
            return false;
        }
        SetHandleInformation(m_stdinWrite, HANDLE_FLAG_INHERIT, 0);

        // Create pipes for stdout
        HANDLE stdoutWrite = nullptr;
        if (!CreatePipe(&m_stdoutRead, &stdoutWrite, &sa, 0))
        {
            CloseHandle(stdinRead);
            CloseHandle(m_stdinWrite);
            return false;
        }
        SetHandleInformation(m_stdoutRead, HANDLE_FLAG_INHERIT, 0);

        // Create pipes for stderr
        HANDLE stderrWrite = nullptr;
        if (!CreatePipe(&m_stderrRead, &stderrWrite, &sa, 0))
        {
            CloseHandle(stdinRead);
            CloseHandle(m_stdinWrite);
            CloseHandle(m_stdoutRead);
            CloseHandle(stdoutWrite);
            return false;
        }
        SetHandleInformation(m_stderrRead, HANDLE_FLAG_INHERIT, 0);

        // Set up process startup info
        STARTUPINFOW si = { 0 };
        si.cb = sizeof(STARTUPINFOW);
        si.dwFlags = STARTF_USESTDHANDLES | STARTF_USESHOWWINDOW;
        si.hStdInput = stdinRead;
        si.hStdOutput = stdoutWrite;
        si.hStdError = stderrWrite;
        si.wShowWindow = SW_HIDE;

        PROCESS_INFORMATION pi = { 0 };

        // Create the process
        BOOL success = CreateProcessW(
            enginePath.c_str(),
            nullptr,
            nullptr,
            nullptr,
            TRUE,
            CREATE_NO_WINDOW,
            nullptr,
            nullptr,
            &si,
            &pi
        );

        // Close handles we don't need
        CloseHandle(stdinRead);
        CloseHandle(stdoutWrite);
        CloseHandle(stderrWrite);

        if (!success)
        {
            DWORD errorCode = GetLastError();
            std::wstringstream errorMsg;
            errorMsg << L"CreateProcessW failed for path: " << enginePath
                     << L" Error code: " << errorCode;
            OutputDebugStringW(errorMsg.str().c_str());

            CleanupProcess();
            return false;
        }

        m_processHandle = pi.hProcess;
        CloseHandle(pi.hThread);

        return true;
    }

    /// <summary>
    /// Thread function to continuously read engine output
    /// </summary>
    void EngineModule::OutputReaderThread()
    {
        char buffer[4096];
        DWORD bytesRead;

        while (m_isRunning)
        {
            // Check if data is available
            DWORD available = 0;
            if (PeekNamedPipe(m_stdoutRead, nullptr, 0, nullptr, &available, nullptr) && available > 0)
            {
                // Read from stdout
                if (ReadFile(m_stdoutRead, buffer, sizeof(buffer) - 1, &bytesRead, nullptr) && bytesRead > 0)
                {
                    buffer[bytesRead] = '\0';
                    std::string output(buffer);

                    // Add to queue
                    {
                        std::lock_guard<std::mutex> lock(m_queueMutex);
                        m_outputQueue.push(output);
                    }

                    // Emit event to JavaScript
                    if (OnEngineOutput)
                    {
                        m_reactContext.JSDispatcher().Post([this, output]()
                        {
                            OnEngineOutput(output);
                        });
                    }
                }
            }

            // Small sleep to prevent busy waiting
            std::this_thread::sleep_for(std::chrono::milliseconds(10));

            // Check if process is still alive
            DWORD exitCode;
            if (GetExitCodeProcess(m_processHandle, &exitCode) && exitCode != STILL_ACTIVE)
            {
                m_isRunning = false;
                break;
            }
        }
    }

    /// <summary>
    /// Copy engine to app data folder to work around UWP restrictions
    /// UWP apps cannot execute files from arbitrary locations
    /// </summary>
    std::wstring EngineModule::CopyEngineToAppData(const std::wstring& sourcePath)
    {
        try
        {
            // Get temp path (accessible by UWP apps)
            wchar_t tempPath[MAX_PATH];
            DWORD tempPathLen = GetTempPathW(MAX_PATH, tempPath);
            if (tempPathLen == 0)
            {
                OutputDebugStringW(L"Failed to get temp path");
                return L"";
            }

            // Create subdirectory for engine
            std::wstring engineDir = std::wstring(tempPath) + L"ChessAppEngine\\";
            CreateDirectoryW(engineDir.c_str(), nullptr);

            // Extract filename from source path
            size_t lastSlash = sourcePath.find_last_of(L"\\/");
            std::wstring filename = (lastSlash != std::wstring::npos)
                ? sourcePath.substr(lastSlash + 1)
                : sourcePath;

            // Destination path
            std::wstring destPath = engineDir + filename;

            // Copy file (overwrite if exists)
            if (!CopyFileW(sourcePath.c_str(), destPath.c_str(), FALSE))
            {
                DWORD errorCode = GetLastError();
                std::wstringstream errorMsg;
                errorMsg << L"Failed to copy engine file. Error code: " << errorCode;
                OutputDebugStringW(errorMsg.str().c_str());
                return L"";
            }

            std::wstringstream successMsg;
            successMsg << L"Copied engine to: " << destPath;
            OutputDebugStringW(successMsg.str().c_str());

            return destPath;
        }
        catch (...)
        {
            OutputDebugStringW(L"Exception in CopyEngineToAppData");
            return L"";
        }
    }

    /// <summary>
    /// Cleanup process handles and stop threads
    /// </summary>
    void EngineModule::CleanupProcess()
    {
        m_isRunning = false;

        // Wait for output thread to finish
        if (m_outputThread.joinable())
        {
            m_outputThread.join();
        }

        // Terminate process if still running
        if (m_processHandle != nullptr)
        {
            TerminateProcess(m_processHandle, 0);
            WaitForSingleObject(m_processHandle, 1000);
            CloseHandle(m_processHandle);
            m_processHandle = nullptr;
        }

        // Close pipes
        if (m_stdinWrite != nullptr)
        {
            CloseHandle(m_stdinWrite);
            m_stdinWrite = nullptr;
        }
        if (m_stdoutRead != nullptr)
        {
            CloseHandle(m_stdoutRead);
            m_stdoutRead = nullptr;
        }
        if (m_stderrRead != nullptr)
        {
            CloseHandle(m_stderrRead);
            m_stderrRead = nullptr;
        }

        // Clear output queue
        {
            std::lock_guard<std::mutex> lock(m_queueMutex);
            while (!m_outputQueue.empty())
            {
                m_outputQueue.pop();
            }
        }
    }
}
