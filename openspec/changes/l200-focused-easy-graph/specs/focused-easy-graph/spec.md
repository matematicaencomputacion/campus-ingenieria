## Purpose
Concentrar el plano de la forma fácil en la ordenada y el desplazamiento hasta el segundo punto, conservando la interacción.
## ADDED Requirements
### Requirement: Encuadre compacto
La forma fácil SHALL mostrar origen, P1, P2 y el recorrido horizontal/vertical con margen, en un lienzo de aproximadamente un tercio del alto original en escritorio. En móvil SHALL conservar al menos 240 px de alto. Las celdas SHALL ser cuadradas (`sx = sy`) y la unidad de grilla SHALL ser aproximadamente el triple de la vista compacta isótropa previa (4,5× la unidad del plano −12..12).
#### Scenario: Todas las pendientes y ordenadas
- **WHEN** se inicia forma fácil con cualquier b y m disponibles
- **THEN** ambos puntos, el origen y el codo del desplazamiento quedan dentro del lienzo sin superposición con consignas.
#### Scenario: Unidad de grilla triple e isótropa
- **WHEN** se inicia forma fácil en easy-b o easy-m
- **THEN** un paso en X y un paso en Y miden lo mismo en píxeles y ese paso es ~3× el de la cámara compacta isótropa anterior.
### Requirement: Interacción y restauración
El encuadre SHALL conservarse al pasar entre fases easy y adaptarse al resize; Reset SHALL restaurar la vista completa.
#### Scenario: Colocar puntos
- **WHEN** se arrastran las fichas al primer y segundo punto
- **THEN** se aceptan y se llega a la fase de construir la recta.
#### Scenario: Reiniciar
- **WHEN** se pulsa Reset tras forma fácil
- **THEN** se recuperan el tamaño normal y el plano de −12 a 12.
