const { withAppDelegate } = require("expo/config-plugins");

// @react-native-firebase/app cannot find its anchor in the scene-based Swift AppDelegate of
// Expo SDK 58 and skips FirebaseApp.configure(). Drop this once the upstream plugin handles it.
module.exports = function withFirebaseConfigure(config) {
  return withAppDelegate(config, (mod) => {
    let src = mod.modResults.contents;
    if (src.includes("FirebaseApp.configure()")) return mod;
    const anchor = "let delegate = ReactNativeDelegate()";
    if (!src.includes(anchor))
      throw new Error("with-firebase-configure: AppDelegate anchor not found");
    if (!/^import FirebaseCore$/m.test(src))
      src = src.replace(/^import React$/m, "import FirebaseCore\nimport React");
    mod.modResults.contents = src.replace(
      anchor,
      `FirebaseApp.configure()\n    ${anchor}`,
    );
    return mod;
  });
};
