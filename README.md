<h1 align="center">CaseScriptAI</h1>
<p align="center">
  <strong>
    A privacy-first, edge-AI powered medical transcription and clinical note generation platform
  </strong>
</p>
<p align="center">
  <img src="https://img.shields.io/badge/Offline--First-On--Device-0f172a?style=flat-square" alt="Offline First" />
  <img src="https://img.shields.io/badge/iOS-Android-1f6feb?style=flat-square" alt="iOS and Android" />
  <img src="https://img.shields.io/badge/Whisper-STT-7c3aed?style=flat-square" alt="Whisper STT" />
  <img src="https://img.shields.io/badge/ExecuTorch-LLM-f97316?style=flat-square" alt="ExecuTorch LLM" />
  <img src="https://img.shields.io/badge/HIPAA-Risk_Minimized-16a34a?style=flat-square" alt="HIPAA Risk Minimized" />
</p>
<p align="center">
  CaseScriptAI is a privacy-first, edge-AI powered medical transcription and clinical note generation platform.
  Designed for offline use in high-security environments, it processes sensitive patient encounters entirely
  on-device, eliminating traditional cloud-based HIPAA and data compliance risks.
</p>
<p align="center">
  By leveraging optimized, quantized Large Language Models (LLMs) and advanced speech recognition directly on
  iOS and Android devices, CaseScriptAI reduces clinical documentation time from hours to minutes.
</p>

## Architecture 

<img width="2048" height="1384" alt="architecture-hld" src="https://github.com/user-attachments/assets/581c31fd-f000-4173-bf1d-03391572b89b" />


## 💼 Business Value

- **Zero-Trust Privacy:** 100% on-device processing guarantees zero data leakage to external cloud APIs. Data stays securely on the clinician’s device.
- **Operational Efficiency:** Automates clinical documentation and structuring, saving physicians an average of 10+ hours per week on charting.
- **Infrastructure Cost:** By pushing compute to the edge, it eliminates expensive recurring cloud inference costs for AI transcription and summarization.
- **Resiliency:** Functions flawlessly in offline environments (e.g., remote clinics, shielded hospital basements).

## 🚀 Getting Started

First, install dependencies from the **root** of the project:

```bash
# Install packages for all apps and libraries in the workspace
yarn install
```

### Running the App Locally

To start the application, navigate to the Expo workspace:

#### 🍎 iOS

```bash
cd apps/CaseScriptAI
yarn ios
# Note: Expo CNG generates the /ios folder and runs pod install automatically.
```

_(Requires Xcode installed on Mac)_

#### 🤖 Android

```bash
cd apps/CaseScriptAI
yarn android
```

_(Requires Android Studio installed)_

#### 🌐 Web (for quick UI testing)

```bash
cd apps/CaseScriptAI
yarn web
```
