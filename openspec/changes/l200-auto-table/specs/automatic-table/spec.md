## Purpose
Preparar automáticamente una actividad de función lineal en L200 y dejar al alumno a cargo del ritmo de respuesta.
## ADDED Requirements
### Requirement: Entrada directa a la tabla
L200 SHALL proponer una función al cargar y al reiniciar, mostrar los cinco valores x y el formato de la primera fila, y habilitar únicamente su respuesta. No SHALL mostrar Play ni Lento durante la tabla.
#### Scenario: Abrir la lección
- **WHEN** el alumno abre L200
- **THEN** ve función, primera fila preparada, casilla habilitada y OK sin pasos previos.
### Requirement: Confirmación por fila
El alumno SHALL confirmar mediante OK o Enter; una respuesta correcta SHALL mostrar ✓ y preparar la siguiente fila, y una incorrecta SHALL permitir corregir sin avanzar. Reiniciar SHALL comenzar una nueva tabla vacía.
#### Scenario: Error y acierto
- **WHEN** se confirma un resultado incorrecto y luego uno correcto
- **THEN** el error conserva la fila activa y solo el acierto habilita la siguiente.
#### Scenario: Última respuesta
- **WHEN** se confirma correctamente la quinta fila
- **THEN** comienza la etapa de graficar, donde Lento vuelve a estar disponible.
