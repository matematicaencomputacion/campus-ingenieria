## Purpose
Permitir responder f(x) por voz en la tabla de L200, sin cambiar su validación matemática ni impedir escribir a mano.
## ADDED Requirements
### Requirement: Dictar un número
La tabla SHALL ofrecer Dictar debajo de sus filas. Una activación SHALL escuchar un número en español, positivo, negativo o decimal, y escribirlo solo en la casilla activa para confirmar con OK o Enter.
#### Scenario: Respuesta reconocida
- **WHEN** se dicta menos uno coma cinco
- **THEN** la casilla activa contiene -1.5 sin modificar la puntuación hasta confirmar.
#### Scenario: Entrada ambigua
- **WHEN** el reconocimiento devuelve una frase que no representa un único número
- **THEN** se informa que no se entendió y se conserva la respuesta anterior.
### Requirement: Control de escucha
La escucha SHALL comenzar solo por acción del usuario, ofrecer cancelación y terminar ante reset, cambio de fila, edición manual o salida. Resultados tardíos SHALL ignorarse.
#### Scenario: Reset durante dictado
- **WHEN** se reinicia antes del resultado
- **THEN** la escucha se cancela y el resultado no altera la tabla.
### Requirement: Compatibilidad
La interfaz SHALL explicar errores de permiso, falta de voz o servicio, y preservar la entrada manual si la API no está disponible. SHALL indicar que el navegador puede procesar voz en línea.
#### Scenario: Sin soporte
- **WHEN** el navegador no dispone de reconocimiento
- **THEN** Dictar aparece deshabilitado con explicación y la casilla manual funciona.
