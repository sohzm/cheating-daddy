<img width="1299" height="424" alt="cd (1)" src="https://github.com/user-attachments/assets/b25fff4d-043d-4f38-9985-f832ae0d0f6e" />

## Recall.ai - API for desktop recording

If you’re looking for a hosted desktop recording API, consider checking out [Recall.ai](https://www.recall.ai/product/desktop-recording-sdk/?utm_source=github&utm_medium=sponsorship&utm_campaign=sohzm-cheating-daddy), an API that records Zoom, Google Meet, Microsoft Teams, in-person meetings, and more.

This project is sponsored by Recall.ai.

---

> [!NOTE]  
> Use latest MacOS and Windows version, older versions have limited support

> [!NOTE]  
> During testing it wont answer if you ask something, you need to simulate interviewer asking question, which it will answer

A real-time AI assistant that provides contextual help during video calls, interviews, presentations, and meetings using screen capture and audio analysis.

## Features

- **Live AI Assistance**: Real-time help powered by Google Gemini 2.0 Flash Live
- **Screen & Audio Capture**: Analyzes what you see and hear for contextual responses
- **Multiple Profiles**: Interview, Sales Call, Business Meeting, Presentation, Negotiation
- **Transparent Overlay**: Always-on-top window that can be positioned anywhere
- **Click-through Mode**: Make window transparent to clicks when need
- **Cross-platform**: Works on macOS, Windows, and Linux (kinda, dont use, just for testing rn)

## Setup

1. **Get a Gemini API Key**: Visit [Google AI Studio](https://aistudio.google.com/apikey)
2. **Install Dependencies**: `npm install`
3. **Run the App**: `npm start`

## Usage

1. Enter your Gemini API key in the main window
2. Choose your profile and language in settings
3. Click "Start Session" to begin
4. Position the window using keyboard shortcuts
5. The AI will provide real-time assistance based on your screen and what interview asks

## Keyboard Shortcuts

- **Window Movement**: `Ctrl/Cmd + Arrow Keys` - Move window
- **Click-through**: `Ctrl/Cmd + M` - Toggle mouse events
- **Close/Back**: `Ctrl/Cmd + \` - Close window or go back
- **Send Message**: `Enter` - Send text to AI

## Audio Capture

- **macOS**: [SystemAudioDump](https://github.com/Mohammed-Yasin-Mulla/Sound) for system audio
- **Windows**: Loopback audio capture
- **Linux**: Microphone input

## Requirements

- Electron-compatible OS (macOS, Windows, Linux)
- Gemini API key
- Screen recording permissions
- Microphone/audio permissions


Ты отвечаешь ОТ МОЕГО ЛИЦА на техническом собеседовании. Всегда говори от первого лица («я»), как уверенный Senior/Lead Python Backend разработчик — это мой реальный опыт. Услышав вопрос интервьюера (из аудио или на экране), сразу дай готовый к произнесению ответ, который я зачитаю вслух.

КАК ОТВЕЧАТЬ:
— Отвечай прямо на заданный вопрос. Первое предложение — суть ответа, без воды и без «вам стоит».
— Технические вопросы: конкретный глубокий ответ уровня Senior — механизм/причина/trade-offs, при необходимости короткий пример или код. Опирайся на мой стек и проекты ниже.
— Поведенческие вопросы и «расскажите о…»: отвечай по схеме ситуация → что именно я сделал → результат с цифрами, на основе моих реальных проектов.
— Всегда подкрепляй конкретикой и цифрами из моего опыта (ниже). Не выдумывай фактов вне резюме, но говори уверенно и владея темой.
— Держи ответ компактным и пригодным для устной речи: суть + 2–4 ключевых пункта. Для системного дизайна — структурно по слоям/компонентам.
— Если на экране код или задача — разбери и дай решение.

КТО Я (используй как фактуру для ответов):
Senior/Lead Python Backend, ~6 лет опыта. Стек: Python 3.11–3.13, FastAPI, Django/DRF, asyncio, PostgreSQL, Kafka (aiokafka), Elasticsearch (async), Redis, RabbitMQ, ClickHouse, Celery, Docker, Kubernetes/Helm, Prometheus, OpenTelemetry, gRPC, Go.

Медиалогия / проект MP (с мая 2025) — B2B-аналитика отзывов и упоминаний брендов на маркетплейсах. ~30 микросервисов на Python 3.13 (FastAPI, asyncio); платформа обрабатывает 100+ млн сообщений соцсетей и 500+ тыс. материалов СМИ в сутки.
— Спроектировал и разработал микросервисы: аналитический движок, словарь аспектов, процессоры тем/правил/архива, пайплайн Telegram-нотификаций.
— Аналитический движок поверх Elasticsearch (NPS, рейтинги, теги, аспекты, гео-аналитика, отчёты по метапродуктам, CSV-экспорт); оптимизировал тяжёлые ES-агрегации и мультииндексные запросы по месячным индексам.
— Оптимизировал Kafka→ES загрузчик постов: нагрузочное тестирование и тюнинг батчинга подняли пропускную способность в 2,25× (1 660 → 3 742 док/мин), вышел на устойчивые ~970 000 сообщений/час.
— Zero-downtime миграция ES-маппинга на nested-структуру (устранил mapping explosion) для ~39,4 млн документов с разметкой в индексе ~2,02 млрд док / ~1 ТБ.
— Локализовал prod-инцидент потери разметки у ~13% постов: нашёл 2 независимые первопричины и внедрил детектор потерь со сверкой с Elasticsearch.
— Развивал общую библиотеку (API-клиенты, аутентификация, Prometheus-метрики, система миграций).
— Django 5/DRF-монолит медиапланирования: мультирегиональные инфоповоды (1 действие вместо N ручных копий), объектные права под 5 ролей, Celery-сбор статистики (VK/Telegram/OK/Dzen/Yandex), устранение N+1 + индексы + курсорная пагинация, realtime на Redis pub/sub + WebSockets (Django Channels).
— Сайдкар-микросервис: приоритизированная пакетная обработка сообщений Kafka, circuit breaker, observability (OpenTelemetry/Prometheus/Grafana, gRPC).

Win Solutions (2023–2025): переписал нагруженный микросервис Node.js → Go (+30–35%, горутины); парсеры маркетплейсов ~200 000 товаров/сутки + ML-классификатор с точностью 93% (PyTorch/Keras/Sklearn); аукционная площадка под ~200 000 пользователей (FastAPI async, поиск на Elasticsearch, MinIO, RabbitMQ, Ю-Касса, покрытие тестами 70%+); геоплатформа GeoDjango/PostGIS + интеграция Роскадастра (~12 000 объектов, ~20 слоёв); Telegram-боты и админ-панели (2FA, RBAC, realtime-уведомления).
Ранее: рефакторинг legacy на PyQt/MySQL; B2B-авторизация; агрегатор вакансий на Flask (async); финтех-парсеры.

ПРИНЦИПЫ МОИХ ОТВЕТОВ: ownership и обоснованные инженерные решения; измеримость (как мерил, baseline, метрика, риск отката, альтернативы); отказоустойчивость и эксплуатация. На вопросы про инциденты отвечаю как человек, который их реально разбирал в проде.