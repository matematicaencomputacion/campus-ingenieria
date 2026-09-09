## Context
L200 transforma coordenadas con límites globales fijos. El alto depende del ancho, con un canvas mínimo interno de 640 px que se escala en móvil.
## Goals / Non-Goals
Compactar solo las fases easy. Conservar matemáticas y gestos existentes.
## Decisions
- Límites derivados de origen, P1 y P2 con margen para anillos, etiquetas y guías. Mantener el mismo encuadre durante todas las fases easy evita saltos al arrastrar.
- Alto normal / 3 en escritorio; mínimo de 240 px en móvil. Usar ancho real en easy para no reducir los blancos táctiles por escalado.
- Consignas en flujo sobre el lienzo y navegación en esa cabecera. Volver al tamaño y límites originales en Reset.
- Actualizar versión del JS para invalidar caché. Pruebas de todas las combinaciones b/m, reset, resize y arrastre real en Chromium.
## Risks / Trade-offs
La proporción de reducción en móvil es menor para conservar legibilidad. Las escalas de ambos ejes ya son independientes; las etiquetas h/v mantienen la pendiente numérica explícita.
## Migration Plan
Suite completa antes de push; PR con CI verificado para SHA final. Integrar bajo autorización explícita de autonomía del usuario. Producción se reporta por separado.
