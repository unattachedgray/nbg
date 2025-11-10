#pragma once

#include "pch.h"
#include "NativeModules.h"
#include <windows.h>
#include <string>
#include <thread>
#include <mutex>
#include <queue>
#include <functional>

using namespace winrt::Microsoft::ReactNative;

namespace ChessApp
{
    /// <summary>
    /// Native module for managing chess engine process communication
    /// Handles spawning the Fairy-Stockfish engine and XBoard/UCI protocol
    /// </summary>
    REACT_MODULE(EngineModule)
    struct EngineModule
    {
        REACT_INIT(Initialize)
        void Initialize(ReactContext const& reactContext) noexcept
        {
            m_reactContext = reactContext;
        }

        // Spawn the chess engine process
        REACT_METHOD(SpawnEngine)
        void SpawnEngine(std::wstring enginePath, ReactPromise<bool> promise) noexcept;

        // Send command to engine stdin
        REACT_METHOD(SendCommand)
        void SendCommand(std::string command, ReactPromise<bool> promise) noexcept;

        // Read output from engine stdout (non-blocking)
        REACT_METHOD(ReadOutput)
        void ReadOutput(ReactPromise<std::string> promise) noexcept;

        // Stop and cleanup engine process
        REACT_METHOD(StopEngine)
        void StopEngine(ReactPromise<bool> promise) noexcept;

        // Check if engine is running
        REACT_METHOD(IsEngineRunning)
        void IsEngineRunning(ReactPromise<bool> promise) noexcept;

        // Event emitters
        REACT_EVENT(OnEngineOutput)
        std::function<void(std::string)> OnEngineOutput;

        REACT_EVENT(OnEngineError)
        std::function<void(std::string)> OnEngineError;

    private:
        ReactContext m_reactContext{ nullptr };

        // Process handles
        HANDLE m_processHandle = nullptr;
        HANDLE m_stdinWrite = nullptr;
        HANDLE m_stdoutRead = nullptr;
        HANDLE m_stderrRead = nullptr;

        // Thread for reading engine output
        std::thread m_outputThread;
        bool m_isRunning = false;
        std::mutex m_mutex;

        // Output queue
        std::queue<std::string> m_outputQueue;
        std::mutex m_queueMutex;

        // Helper methods
        bool CreateEngineProcess(const std::wstring& enginePath);
        std::wstring CopyEngineToAppData(const std::wstring& sourcePath);
        void OutputReaderThread();
        void CleanupProcess();
        std::string ReadFromPipe(HANDLE pipe);
    };
}
