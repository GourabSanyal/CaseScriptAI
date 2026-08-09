import ExpoModulesCore
import AVFoundation

public class AudioPresenceModule: Module {
  public func definition() -> ModuleDefinition {
    Name("AudioPresence")

    Function("isOtherAudioActive") { () -> Bool in
      let session = AVAudioSession.sharedInstance()
      return session.isOtherAudioPlaying || session.secondaryAudioShouldBeSilencedHint
    }
  }
}
