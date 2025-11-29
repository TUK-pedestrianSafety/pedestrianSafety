# 프론트 환경

* Vite + Typescript 사용

## 커밋 예정(11/19 수정)

* 1차: 기초 웹 구성 및 css, 시뮬레이션 애니메이션 작동 테스트 위주(11/18 반영)
* 2차: TypeScript Strict Mode 적용 및 Mock API를 활용한 DB 연동 구조 설계(11/20 예정) - 11/24일 반영

  * Service Layer 패턴을 적용하여, 추후 mockApi.ts 파일만 교체하면 즉시 실제 DB와 연동되도록 구현
  * 데이터 로딩 상태(Skeleton/Loading UI) 및 비동기 데이터 처리 로직 구현 완료

* 3차: 추후 제공될 백엔드 API 연동 및 실데이터 반영 예정

  11/29 (오늘): 위험 분석 로직 개선(고장=Critical), DB Flooding 방지, API 리팩토링.
  11/27: 보행자 시뮬레이션(객체 유형 선택) 추가.
  11/26: 센서 고장 로직 수정 및 버그 해결.