## Context
La función startFill recrea las filas; chooseM ya la llama. El botón Play vuelve a llamarla y descarta lo escrito. Reset retorna a pick-b.
## Decisions
Reset selecciona b y m de B_OPTS y M_OPTS y prepara la tabla sin activar audio por sí mismo. El arranque comparte ese flujo. Se mantienen los valores de x y las validaciones. Se elimina el control Play y Lento solo se ofrece en etapas gráficas; el tiempo de transición de la tabla es fijo aunque se haya activado Lento antes. La cabecera indica Completá f(x).
## Risks / Trade-offs
La función propuesta es aleatoria dentro de las opciones ya existentes; las pruebas fijan coeficientes mediante la API de diagnóstico existente para conservar casos deterministas, y verifican el inicio real sin usar esa API. Se comprueba que error no avance, acierto prepare solo la siguiente fila y Reiniciar limpie respuestas y dictado.
## Delivery
npm run test:all, revisión visual, PR y CI de SHA final antes del merge autorizado. Registrar evidencia de PR/main en GitHub. Producción no se considera actualizada si SSH/rsync quedan omitidos; ofrecer vista local hasta disponer del acceso al servidor.

## Validación local
npm run test:all pasó: 81 checks estáticos, nueve unidades, 192 páginas, 28 lecciones con sliders, nueve escenarios de navegación y doce de L200. Capturas revisadas a 390/1440 px. La prueba nueva detectó que el estilo de botón anulaba hidden; una regla específica asegura que Lento desaparezca de la tabla. Se mantienen las pruebas de dictado simulado y arrastre real.
