package expo.modules.audiopresence

import android.content.Context
import android.media.AudioManager
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class AudioPresenceModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("AudioPresence")

    Function("isOtherAudioActive") {
      val context = appContext.reactContext ?: return@Function false
      val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager
        ?: return@Function false
      when (audioManager.mode) {
        AudioManager.MODE_IN_CALL,
        AudioManager.MODE_IN_COMMUNICATION,
        AudioManager.MODE_RINGTONE -> true
        else -> audioManager.isMusicActive
      }
    }
  }
}
