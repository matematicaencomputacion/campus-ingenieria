# Diseño

Usar docs/base-standards.md como fuente común con entradas pequeñas por copilot.
Los adaptadores son archivos de texto para facilitar clones sin soporte de symlinks.
OpenSpec referencia el contexto existente; no inventa APIs ni requisitos de backend.
No se importa el kit íntegro: sus defaults de React, inglés y Opus no describen Campus.

La verificación consiste en resolver referencias, validar OpenSpec y ejecutar npm test.
No se modifica runtime. El PR mantiene el CI existente; merge separado y autorizado.
