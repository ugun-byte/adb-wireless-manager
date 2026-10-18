# ⚡ ADB Wireless Debugging Manager

<p align="center">
  <img src="icon.png" width="160" height="160" alt="ADB Wireless Icon" style="border-radius: 32px;" />
  <br>
  <b>Mac & Windows 지원 초간편 안드로이드 무선 디버깅(Wireless Debugging) 매니저</b>
  <br>
  <i>별도 패키지 설치 없이 (Zero Dependencies) 브라우저 UI로 즉시 페어링 및 연결</i>
</p>

---

## ✨ 주요 기능 (Key Features)

* **🚀 0 Dependencies**: Node.js 표준 라이브러리만 사용하여 `npm install` 과정 없이 바로 실행됩니다.
* **💻 멀티 플랫폼 지원 (Cross-Platform)**:
  * **macOS**: Apple Silicon (M1/M2/M3/M4) 및 Intel Mac 지원, 원클릭 데스크톱 앱 지원
  * **Windows**: `start.bat` 더블 클릭 한 번으로 자동 실행 및 브라우저 열기
* **🔍 실시간 mDNS 기기 감지**: Wi-Fi 망의 안드로이드 기기(`_adb-tls-pairing`, `_adb-tls-connect`)를 실시간으로 자동 감지하여 IP와 포트를 자동으로 완성해 줍니다.
* **🔑 페어링 코드 자동 연결**: 폰 팝업의 6자리 페어링 코드 입력 시 `adb pair` 후 연결 포트로 즉시 자동 전환 및 연결(`adb connect`)됩니다.
* **📷 QR 코드 안내**: Android Studio 기기 관리자(Device Manager) 및 QR 코드 페어링 가이드 탑재.
* **📱 실시간 기기 관리**: 모델명(예: Galaxy Z Fold 6 / S24 등), 연결 상태, 1-Click 연결 해제/재연결 지원.

---

## 🛠️ 시작하기 (Quick Start)

### 1. 사전 요구사항 (Prerequisites)
* **Node.js** (v16 이상 권장)
* **Android Debug Bridge (adb)**:
  * macOS: `brew install android-platform-tools` 또는 Android Studio
  * Windows: Android Studio 또는 Platform Tools

---

### 🖥️ Windows에서 실행하기
1. 저장소를 클론하거나 다운로드합니다.
2. **`start.bat`** 파일을 더블 클릭하여 실행합니다.
3. 브라우저가 자동으로 열리며 `http://localhost:4567`로 접속됩니다.

```cmd
git clone https://github.com/ugun-byte/adb-wireless-manager.git
cd adb-wireless-manager
start.bat
```

---

### 🍎 macOS에서 실행하기
1. 저장소를 클론합니다.
2. 터미널에서 실행하거나 **`start.sh`**를 실행합니다.

```bash
git clone https://github.com/ugun-byte/adb-wireless-manager.git
cd adb-wireless-manager
chmod +x start.sh
./start.sh
```

---

## 💡 무선 디버깅 연결 가이드 (Pairing Guide)

안드로이드 11 이상에서는 무선 디버깅 시 2개의 서로 다른 포트가 사용됩니다:

```text
[휴대폰 무선 디버깅 화면]
├── 1. 메인 화면: 'IP 주소 및 포트' ──▶ [연결 포트 (Connect Port)]
└── 2. '페어링 코드로 기기 페어링' 팝업 ──▶ [페어링 포트 (Pairing Port)] & [6자리 페어링 코드]
```

> ⚠️ **주의사항 (자주 발생하는 페어링 실패 원인)**
> * 폰의 **'페어링 코드로 기기 페어링'** 팝업창을 닫으면 해당 코드와 포트는 **즉시 폐기**됩니다.
> * 반드시 **팝업창을 띄워둔 상태**에서 팝업창에 적힌 **5자리 포트**와 **6자리 코드**를 입력하고 연결 버튼을 눌러주세요.
> * 성공하면 매니저가 메인 화면의 연결 포트로 자동 전환하여 영구 등록합니다.

---

## 📜 라이선스 (License)

MIT License © 2026 ugun-byte
