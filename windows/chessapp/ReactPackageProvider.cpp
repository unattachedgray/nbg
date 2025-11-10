#include "pch.h"
#include "ReactPackageProvider.h"
#include "NativeModules.h"
#include "EngineModule.h"

using namespace winrt::Microsoft::ReactNative;

namespace winrt::chessapp::implementation
{

void ReactPackageProvider::CreatePackage(IReactPackageBuilder const &packageBuilder) noexcept
{
    // Register our custom native modules
    packageBuilder.AddModule(L"EngineModule", MakeModuleProvider<ChessApp::EngineModule>());

    // Register other attributed modules
    AddAttributedModules(packageBuilder, true);
}

} // namespace winrt::chessapp::implementation
