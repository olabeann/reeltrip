릴트립 흰색 앱 아이콘 · 2026-11-17

배경: 순백색 #FFFFFF. 텍스트 없음. 심벌 원본 유지.

iOS
- ios/AppIcon.appiconset/을 Xcode Assets.xcassets에 추가합니다.
- 1024x1024 불투명 PNG, 모서리 자르기 없음. 시스템이 마스크를 적용합니다.
- 기본 컬러 PNG 버전입니다. Icon Composer 레이어/전용 dark·tinted 버전은 포함하지 않습니다.

Android
- android/play-store-512.png: 스토어용 512x512 불투명 PNG.
- android/res/: 기존 리소스와 이름 충돌을 확인해 병합합니다.
- AndroidManifest.xml application의 android:icon을 @mipmap/ic_launcher로 지정합니다.
- 기존 android:roundIcon이 별도 아이콘을 가리키면 제거하거나 동일 @mipmap/ic_launcher로 맞춥니다.
- API 26 이상: 흰색 배경 + 투명 전경의 adaptive icon.
- 전경 108dp 캔버스에 심벌 높이 60dp로 배치해 마스크 여백을 확보했습니다.
- 이전 버전: 밀도별 일반 PNG가 제공됩니다.
- 사용자 테마용 별도 monochrome 레이어는 포함하지 않습니다.

이미지 크기·흰색 배경을 확인했습니다. 실제 앱 빌드 및 기기 설치 검증은 별도입니다.
공식 참고:
https://developer.apple.com/design/human-interface-guidelines/app-icons
https://developer.android.com/develop/ui/compose/system/icon_design_adaptive
