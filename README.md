# CaseScriptAI

CaseScriptAI is a privacy-first, edge-AI powered medical transcription and clinical note generation platform. Designed for offline use in high-security environments, it processes sensitive patient encounters entirely on-device, eliminating traditional cloud-based HIPAA and data compliance risks.

By leveraging optimized, quantized Large Language Models (LLMs) and advanced speech recognition directly on iOS and Android devices, CaseScriptAI reduces clinical documentation time from hours to minutes.

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
