# Normas del Repositorio
Este repositorio es una bifurcación de [`cheating-daddy`] (https://github.com/sohzm/cheating-daddy\).
Proporciona un asistente en tiempo real basado en Electron que captura la pantalla y el audio
para respuestas contextuales de IA. El código está en JavaScript y utiliza Electron Forge para
el empaquetado.
-----
## Empezar
Instala las dependencias y ejecuta la aplicación de desarrollo:
```
1. npm install
2. npm start
```
-----
## Estilo
Ejecuta `npx prettier --write .` antes de hacer commit. Prettier utiliza la configuración en
`.prettierrc` (indentación de cuatro espacios, ancho de impresión 150, punto y coma y comillas simples).
Se ignoran `src/assets` y `node_modules` a través de `.prettierignore`.
El proyecto no proporciona linting; `npm run lint` simplemente imprime
"No linting configured".
-----
## Estándares de código
El desarrollo está migrando gradualmente hacia una base de código de TypeScript/React inspirada en el
proyecto [transcriber](https://github.com/Gatecrashah/transcriber). Ten en cuenta las siguientes
reglas a medida que se crean nuevos archivos:
  - **Modo estricto de TypeScript** – evita `any` y prefiere interfaces explícitas.
  - **Los componentes de React** deben ser funcionales con hooks y estar envueltos en
      límites de error donde sea apropiado.
  - **IPC seguro** – valida y sanea todos los parámetros que cruzan el límite entre el renderizador
      y el proceso principal.
  - **Audio no bloqueante** – el procesamiento pesado debe mantenerse fuera del hilo de la interfaz de usuario.
  - **Tests** – cada nueva característica requiere tests una vez que el conjunto de pruebas esté disponible.
-----
## Shadcn y Electron
La interfaz se está reconstruyendo con componentes de [shadcn/ui](https://ui.shadcn.com).
Sigue estas pautas cuando trabajes en el código de la interfaz de usuario:
  - **Directorio de componentes** – coloca los archivos generados en `src/components/ui` y expórtalos
    desde esa carpeta.
  - **Añade componentes con el CLI** – ejecuta `npx shadcn@latest add <component>`; nunca crees componentes manualmente.
  - **Patrón de componentes** – usa `React.forwardRef` con la función auxiliar `cn()` para los nombres
    de clase.
  - **Alias de ruta** – importa módulos de `src` usando el prefijo `@/`.
  - **React 19 + Compiler** – apunta a React 19 con el nuevo compilador cuando esté disponible.
  - **Aislamiento de contexto** – mantén el patrón de aislamiento de contexto de Electron para IPC.
  - **Modo estricto de TypeScript** – ejecuta `npm run typecheck` antes de declarar que el trabajo
    está completo.
  - **Temas de Tailwind** – confía en las variables CSS y las utilidades en `@/utils/tailwind` para el estilo.
  - **Pruebas sin ejecutar** – confirma `npm run typecheck` y la resolución de módulos con `node -e "require('<file>')"`.
-----
## Tests
Todavía no hay pruebas automatizadas. Cuando se agregue un conjunto, ejecuta `npm test` antes de cada
commit. Hasta entonces, como mínimo, asegúrate de que `npm install` y `npm start` funcionen después de
fusionar los cambios de la rama principal.
-----
## Fusionar PRs de la rama principal
Las solicitudes de pull requests de [https://github.com/sohzm/cheating-daddy](https://github.com/sohzm/cheating-daddy)
suelen ser cherry-picked aquí. Al fusionar:
1.  Inspecciona la diferencia y mantén los mensajes de commit cortos (`feat:` / `fix:` etc.).
2.  Después de la fusión, ejecuta la aplicación localmente para verificar que todavía se compile y funcione.
-----
## Estrategia y trabajo futuro
Planeamos extender este proyecto con ideas del proyecto
[`transcriber`](https://www.google.com/search?q=%5Bhttps://github.com/Gatecrashah/transcriber%5D\(https://github.com/Gatecrashah/transcriber\)) que también usa Electron. Los
objetivos clave son:
  - **Transcipción local** – integra `whisper.cpp` para permitir el reconocimiento de voz a texto
      sin conexión. Investiga la arquitectura utilizada en `transcriber/src/main` para la validación
      de modelos y la aceleración por GPU.
  - **Captura de audio dual** – captura el micrófono y el audio del sistema simultáneamente.
      `transcriber` muestra un enfoque usando un asistente nativo para macOS y
      `getDisplayMedia` de Electron para otras plataformas.
  - **Diarización de hablantes** – explora tinydiarize para identificar a los hablantes en transmisiones
      de audio mono.
  - **Detección de actividad de voz** – omite segmentos silenciosos o de baja calidad antes de
      enviarlos al servicio de IA.
  - **Manejo mejorado de notas** – almacena las transcripciones localmente y asócialas con
      notas de reuniones, de forma similar al sistema de gestión de notas de `transcriber`.
  - **Infraestructura de pruebas** – adopta Jest y React Testing Library (si se introduce React)
      para cubrir los módulos de captura de audio y transcripción.
### Tareas pendientes
1.  Investigar y prototipar la transcripción local usando `whisper.cpp`.
2.  Añadir lógica de captura de audio de flujo dual para soporte multiplataforma.
3.  Investigar opciones de diarización de hablantes e integrarlas cuando sea factible.
4.  Planificar una ruta de migración hacia una configuración de pruebas adecuada (Jest o similar).
5.  Documentar las consideraciones de seguridad para el almacenamiento y procesamiento de audio.
6.  Reconstruir toda la interfaz de usuario usando componentes de shadcn.
Estos planes son aspiracionales; impleméntalos gradualmente mientras mantienes la aplicación
funcional.
-----
## Principios de procesamiento de audio
Al implementar funciones de transcripción, toma prestadas las siguientes reglas de `transcriber`:
  - **Compatibilidad con 16 kHz** – remuestrea todo el audio antes de enviarlo a whisper.cpp.
  - **Arquitectura de flujo dual** – captura el micrófono y el audio del sistema en canales separados.
  - **Diarización de hablantes** – integra tinydiarize (`--tinydiarize` flag) para audio mono y
      analiza los marcadores `[SPEAKER_TURN]` para etiquetar a los hablantes (Hablante A, B, C...).
  - **Detección de actividad de voz** – prefiltra los segmentos silenciosos para mejorar la velocidad.
  - **Preservación de la calidad** – mantén la fidelidad de la muestra y evita bloquear la interfaz
      de usuario durante el procesamiento pesado.
  - **Eficiencia de la memoria** – transmite archivos de audio grandes en lugar de cargarlos todos a la vez.
  - **Recuperación de errores** – maneja las fallas de los dispositivos de audio de manera elegante.
-----
## Privacidad desde el diseño
  - **Procesamiento local** – las transcripciones deben realizarse localmente siempre que sea posible.
  - **Control del usuario** – proporciona opciones claras para la retención y eliminación de datos.
  - **Transparencia** – documenta qué se almacena y dónde.
  - **Datos mínimos** – solo persiste lo que es necesario para la funcionalidad.
-----
## Planes para LLM
Hay archivos de marcador de posición para una futura integración de LLM (por ejemplo, modelos Qwen a
través de `llama.cpp`). Continúa el desarrollo después de que la canalización de transcripción central
sea estable y asegúrate de que los tests cubran esta nueva funcionalidad.