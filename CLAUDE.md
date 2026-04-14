# ACDA Digital Transformation Module

## Project Identity
- Company: ACDA Consulting (acda.ro)
- Agent Role: Development agent — SINGURUL writer de cod
- Security: review obligatoriu înainte de orice deploy

## Stack
- React + TypeScript + Vite
- react-router-dom (routing URL)
- Tailwind CSS v4

## Commands
- npm run dev — Start dev server
- npm run build — Production build
- npm run lint — ESLint
- npm run typecheck — tsc --noEmit

## Architecture
- src/pages/ — pagini principale (3 pagini: Dashboard, ClientIntake, MaturityRisk)
- src/components/ — componente reutilizabile (EBITWidget)
- src/context/ — ProjectContext (state global per proiect)
- src/constants/ — metodologie ACDA v1.1 (indicatori, praguri, ponderi)
- src/utils/ — maturityCalculator (formule scoring)
- src/theme/ — stiluri nivel partajate (LEVEL_STYLE)
- src/types/ — TypeScript types
- Metodologie: Manual ACDA v1.1 = sursa de adevăr

## Conventions
- Toate PR-urile trebuie să fie DRAFT — nu merge direct
- Fiecare funcție publică din utils/ să aibă JSDoc
- Folosește doar parameterized queries — fără string interpolation în SQL
- Nu commit .env sau secrete

## Boundaries
- NU accesa /home/sparkacda1/proiecte/flow-ai-ro/ — proiect separat
- NU folosi sudo sau instala pachete sistem
- NU face request-uri HTTP externe fără instructiune explicită
- NU deploya direct — doar draft PR
