window.CAMPUS = {
  brand: "Campus Ingeniería",
  student: "Darío",
  countries: [
    { id: "ar", name: "Argentina", short: "AR", region: "america" },
    { id: "bo", name: "Bolivia", short: "BO", region: "america" },
    { id: "br", name: "Brasil", short: "BR", region: "america" },
    { id: "cl", name: "Chile", short: "CL", region: "america" },
    { id: "co", name: "Colombia", short: "CO", region: "america" },
    { id: "cr", name: "Costa Rica", short: "CR", region: "america" },
    { id: "cu", name: "Cuba", short: "CU", region: "america" },
    { id: "do", name: "República Dominicana", short: "DO", region: "america" },
    { id: "ec", name: "Ecuador", short: "EC", region: "america" },
    { id: "sv", name: "El Salvador", short: "SV", region: "america" },
    { id: "gt", name: "Guatemala", short: "GT", region: "america" },
    { id: "hn", name: "Honduras", short: "HN", region: "america" },
    { id: "mx", name: "México", short: "MX", region: "america" },
    { id: "ni", name: "Nicaragua", short: "NI", region: "america" },
    { id: "pa", name: "Panamá", short: "PA", region: "america" },
    { id: "py", name: "Paraguay", short: "PY", region: "america" },
    { id: "pe", name: "Perú", short: "PE", region: "america" },
    { id: "pr", name: "Puerto Rico", short: "PR", region: "america" },
    { id: "uy", name: "Uruguay", short: "UY", region: "america" },
    { id: "ve", name: "Venezuela", short: "VE", region: "america" },
    { id: "us", name: "Estados Unidos", short: "US", region: "america" },
    { id: "al", name: "Albania", short: "AL", region: "europa" },
    { id: "de", name: "Alemania", short: "DE", region: "europa" },
    { id: "ad", name: "Andorra", short: "AD", region: "europa" },
    { id: "at", name: "Austria", short: "AT", region: "europa" },
    { id: "be", name: "Bélgica", short: "BE", region: "europa" },
    { id: "by", name: "Bielorrusia", short: "BY", region: "europa" },
    { id: "ba", name: "Bosnia y Herzegovina", short: "BA", region: "europa" },
    { id: "bg", name: "Bulgaria", short: "BG", region: "europa" },
    { id: "cy", name: "Chipre", short: "CY", region: "europa" },
    { id: "va", name: "Ciudad del Vaticano", short: "VA", region: "europa" },
    { id: "hr", name: "Croacia", short: "HR", region: "europa" },
    { id: "dk", name: "Dinamarca", short: "DK", region: "europa" },
    { id: "sk", name: "Eslovaquia", short: "SK", region: "europa" },
    { id: "si", name: "Eslovenia", short: "SI", region: "europa" },
    { id: "es", name: "España", short: "ES", region: "europa" },
    { id: "ee", name: "Estonia", short: "EE", region: "europa" },
    { id: "fi", name: "Finlandia", short: "FI", region: "europa" },
    { id: "fr", name: "Francia", short: "FR", region: "europa" },
    { id: "gr", name: "Grecia", short: "GR", region: "europa" },
    { id: "hu", name: "Hungría", short: "HU", region: "europa" },
    { id: "ie", name: "Irlanda", short: "IE", region: "europa" },
    { id: "is", name: "Islandia", short: "IS", region: "europa" },
    { id: "it", name: "Italia", short: "IT", region: "europa" },
    { id: "xk", name: "Kosovo", short: "XK", region: "europa" },
    { id: "lv", name: "Letonia", short: "LV", region: "europa" },
    { id: "li", name: "Liechtenstein", short: "LI", region: "europa" },
    { id: "lt", name: "Lituania", short: "LT", region: "europa" },
    { id: "lu", name: "Luxemburgo", short: "LU", region: "europa" },
    { id: "mk", name: "Macedonia del Norte", short: "MK", region: "europa" },
    { id: "mt", name: "Malta", short: "MT", region: "europa" },
    { id: "md", name: "Moldavia", short: "MD", region: "europa" },
    { id: "mc", name: "Mónaco", short: "MC", region: "europa" },
    { id: "me", name: "Montenegro", short: "ME", region: "europa" },
    { id: "no", name: "Noruega", short: "NO", region: "europa" },
    { id: "nl", name: "Países Bajos", short: "NL", region: "europa" },
    { id: "pl", name: "Polonia", short: "PL", region: "europa" },
    { id: "pt", name: "Portugal", short: "PT", region: "europa" },
    { id: "gb", name: "Reino Unido", short: "GB", region: "europa" },
    { id: "cz", name: "República Checa", short: "CZ", region: "europa" },
    { id: "ro", name: "Rumanía", short: "RO", region: "europa" },
    { id: "ru", name: "Rusia", short: "RU", region: "europa" },
    { id: "sm", name: "San Marino", short: "SM", region: "europa" },
    { id: "rs", name: "Serbia", short: "RS", region: "europa" },
    { id: "se", name: "Suecia", short: "SE", region: "europa" },
    { id: "ch", name: "Suiza", short: "CH", region: "europa" },
    { id: "ua", name: "Ucrania", short: "UA", region: "europa" }
  ],
  universities: [
    { id: "udi", name: "Universidad del Desarrollo Ingenieril", short: "UDI", countryId: "ar" },
    { id: "its", name: "Instituto Tecnológico del Sur", short: "ITS", countryId: "ar" },
    { id: "uai", name: "Universidad Abierta de Ingeniería", short: "UAI", countryId: "mx" },
    { id: "poli", name: "Politécnico Nacional de Práctica", short: "PNP", countryId: "us" }
  ],
  careers: [
    {
      id: "civil",
      name: "Ingeniería Civil",
      short: "Civil",
      materias: [
        { id: "estatica", name: "Estática y Resistencia de Materiales", profesor: "Ing. Laura Méndez", temas: [
          { id: "t1", title: "TEMA 1. Equilibrio de cuerpos rígidos", nodos: [
            { id: "n1", title: "1.1. Introducción y objetivos" },
            { id: "n2", title: "1.2. Sistemas de fuerzas" },
            { id: "n3", title: "1.3. Momentos y cuplas" },
            { id: "n4", title: "1.4. Diagramas de cuerpo libre" }
          ]},
          { id: "t2", title: "TEMA 2. Esfuerzo y deformación", nodos: [
            { id: "n5", title: "2.1. Esfuerzo axial" },
            { id: "n6", title: "2.2. Ley de Hooke" },
            { id: "n7", title: "2.3. Concentración de tensiones" }
          ]},
          { id: "t3", title: "TEMA 3. Flexión y cortante", nodos: [
            { id: "n8", title: "3.1. Momento flector" },
            { id: "n9", title: "3.2. Esfuerzo cortante" }
          ]}
        ]},
        { id: "hidraulica", name: "Hidráulica Aplicada", profesor: "Ing. Marcos Vidal", temas: [
          { id: "t1", title: "TEMA 1. Fluidos y propiedades", nodos: [
            { id: "n1", title: "1.1. Densidad y viscosidad" },
            { id: "n2", title: "1.2. Presión hidrostática" }
          ]},
          { id: "t2", title: "TEMA 2. Flujo en tuberías", nodos: [
            { id: "n3", title: "2.1. Ecuación de Bernoulli" },
            { id: "n4", title: "2.2. Pérdidas de carga" }
          ]}
        ]},
        { id: "estructuras", name: "Análisis Estructural", profesor: "Dra. Ana Ruiz", temas: [
          { id: "t1", title: "TEMA 1. Estructuras isostáticas", nodos: [
            { id: "n1", title: "1.1. Vigas y pórticos" },
            { id: "n2", title: "1.2. Métodos de equilibrio" }
          ]}
        ]}
      ]
    },
    {
      id: "industrial",
      name: "Ingeniería Industrial",
      short: "Industrial",
      materias: [
        { id: "procesos", name: "Diseño de Procesos Productivos", profesor: "Ing. Sofía Castro", temas: [
          { id: "t1", title: "TEMA 1. Mapeo de procesos", nodos: [
            { id: "n1", title: "1.1. SIPOC y flujogramas" },
            { id: "n2", title: "1.2. Cuellos de botella" }
          ]},
          { id: "t2", title: "TEMA 2. Lean manufacturing", nodos: [
            { id: "n3", title: "2.1. Los 7 desperdicios" },
            { id: "n4", title: "2.2. 5S y estandarización" }
          ]}
        ]},
        { id: "calidad", name: "Gestión de la Calidad", profesor: "Ing. Pedro Gómez", temas: [
          { id: "t1", title: "TEMA 1. Sistemas de calidad", nodos: [
            { id: "n1", title: "1.1. ISO 9001" },
            { id: "n2", title: "1.2. Indicadores de calidad" }
          ]}
        ]},
        { id: "logistica", name: "Logística y Cadena de Suministro", profesor: "Ing. Valeria Soto", temas: [
          { id: "t1", title: "TEMA 1. Inventarios", nodos: [
            { id: "n1", title: "1.1. Modelo EOQ" },
            { id: "n2", title: "1.2. Seguridad de stock" }
          ]}
        ]}
      ]
    },
    {
      id: "informatica",
      name: "Ingeniería Informática",
      short: "Informática",
      materias: [
        { id: "mate1", name: "Matemática 1 Anual", profesor: "Cátedra Matemática · UTDT", temas: [
          { id: "t-limites", title: "UNIDAD. Límites (Práctica 3)", nodos: [
            { id: "n1", title: "1.1. Límites desde el gráfico de f" },
            { id: "n2", title: "1.2. Composición f ∘ g y enunciados V/F" },
            { id: "n3", title: "1.3. Más límites desde gráficos" },
            { id: "n4", title: "1.4. Función con dominio restringido" },
            { id: "n5", title: "1.5. Cálculo algebraico de límites" },
            { id: "n6", title: "1.6. Constante a y límites con raíces" },
            { id: "n7", title: "1.7. Límites laterales con valor absoluto" },
            { id: "n8", title: "1.8. Función definida por partes" },
            { id: "n9", title: "1.9. Laterales en x → 0 y existencia" },
            { id: "n10", title: "1.10. Propiedades básicas de límites" },
            { id: "n11", title: "1.11. Práctica 3 · material (PDF)" }
          ]}
        ]},
        { id: "algoritmos", name: "Algoritmos y Estructuras de Datos", profesor: "Dr. Diego Fernández", temas: [
          { id: "t1", title: "TEMA 1. Complejidad algorítmica", nodos: [
            { id: "n1", title: "1.1. Notación Big-O" },
            { id: "n2", title: "1.2. Recursión" }
          ]},
          { id: "t2", title: "TEMA 2. Estructuras lineales", nodos: [
            { id: "n3", title: "2.1. Listas y pilas" },
            { id: "n4", title: "2.2. Colas y deques" }
          ]},
          { id: "t3", title: "TEMA 3. Árboles y grafos", nodos: [
            { id: "n5", title: "3.1. Árboles binarios" },
            { id: "n6", title: "3.2. Recorridos en grafos" }
          ]}
        ]},
        { id: "bd", name: "Bases de Datos", profesor: "Ing. Camila Ortiz", temas: [
          { id: "t1", title: "TEMA 1. Modelo relacional", nodos: [
            { id: "n1", title: "1.1. Entidad-relación" },
            { id: "n2", title: "1.2. Normalización" }
          ]},
          { id: "t2", title: "TEMA 2. SQL avanzado", nodos: [
            { id: "n3", title: "2.1. Joins y subconsultas" },
            { id: "n4", title: "2.2. Índices y rendimiento" }
          ]}
        ]},
        { id: "ia", name: "Fundamentos de IA Generativa", profesor: "Dra. Elena Vargas", temas: [
          { id: "t1", title: "TEMA 1. Métodos de la IA generativa", nodos: [
            { id: "n1", title: "1.1. Introducción y objetivos" },
            { id: "n2", title: "1.2. Tipos de inteligencia artificial" },
            { id: "n3", title: "1.3. Procesos generativos" }
          ]},
          { id: "t2", title: "TEMA 2. Ingeniería de prompts", nodos: [
            { id: "n4", title: "2.1. Fundamentos de prompts" },
            { id: "n5", title: "2.2. Refinamiento" }
          ]},
          { id: "t3", title: "TEMA 3. Ética y uso responsable", nodos: [
            { id: "n6", title: "3.1. Sesgos y riesgos" },
            { id: "n7", title: "3.2. Buenas prácticas" }
          ]}
        ]},
        { id: "redes", name: "Redes y Sistemas Distribuidos", profesor: "Ing. Tomás Herrera", temas: [
          { id: "t1", title: "TEMA 1. Modelo OSI", nodos: [
            { id: "n1", title: "1.1. Capas y protocolos" },
            { id: "n2", title: "1.2. TCP/IP en la práctica" }
          ]}
        ]}
      ]
    },
    {
      id: "mecanica",
      name: "Ingeniería Mecánica",
      short: "Mecánica",
      materias: [
        { id: "termo", name: "Termodinámica", profesor: "Ing. Ricardo Peña", temas: [
          { id: "t1", title: "TEMA 1. Leyes de la termodinámica", nodos: [
            { id: "n1", title: "1.1. Primera ley" },
            { id: "n2", title: "1.2. Segunda ley y entropía" }
          ]}
        ]},
        { id: "maquinas", name: "Diseño de Máquinas", profesor: "Ing. Paula Ríos", temas: [
          { id: "t1", title: "TEMA 1. Elementos de máquinas", nodos: [
            { id: "n1", title: "1.1. Ejes y rodamientos" },
            { id: "n2", title: "1.2. Engranajes" }
          ]}
        ]},
        { id: "cad", name: "Diseño Asistido por Computadora", profesor: "Ing. Julián Mora", temas: [
          { id: "t1", title: "TEMA 1. Modelado 3D", nodos: [
            { id: "n1", title: "1.1. Bocetos y extrusiones" },
            { id: "n2", title: "1.2. Ensamblajes" }
          ]}
        ]}
      ]
    },
    {
      id: "electrica",
      name: "Ingeniería Eléctrica",
      short: "Eléctrica",
      materias: [
        { id: "circuitos", name: "Circuitos Eléctricos", profesor: "Ing. Nora Díaz", temas: [
          { id: "t1", title: "TEMA 1. Leyes de Kirchhoff", nodos: [
            { id: "n1", title: "1.1. Nodos y mallas" },
            { id: "n2", title: "1.2. Teoremas de red" }
          ]}
        ]},
        { id: "potencia", name: "Sistemas de Potencia", profesor: "Ing. Hugo Salas", temas: [
          { id: "t1", title: "TEMA 1. Generación y transmisión", nodos: [
            { id: "n1", title: "1.1. Redes eléctricas" },
            { id: "n2", title: "1.2. Estabilidad" }
          ]}
        ]}
      ]
    },
    {
      id: "electronica",
      name: "Ingeniería Electrónica",
      short: "Electrónica",
      materias: [
        { id: "analogica", name: "Electrónica Analógica", profesor: "Ing. Lucía Bravo", temas: [
          { id: "t1", title: "TEMA 1. Amplificadores", nodos: [
            { id: "n1", title: "1.1. Transistores BJT" },
            { id: "n2", title: "1.2. Op-amps" }
          ]}
        ]},
        { id: "digital", name: "Electrónica Digital", profesor: "Ing. Andrés Luna", temas: [
          { id: "t1", title: "TEMA 1. Lógica combinacional", nodos: [
            { id: "n1", title: "1.1. Puertas lógicas" },
            { id: "n2", title: "1.2. Multiplexores" }
          ]}
        ]},
        { id: "embebidos", name: "Sistemas Embebidos", profesor: "Ing. Carla Núñez", temas: [
          { id: "t1", title: "TEMA 1. Microcontroladores", nodos: [
            { id: "n1", title: "1.1. Arquitectura MCU" },
            { id: "n2", title: "1.2. Periféricos I/O" }
          ]}
        ]}
      ]
    },
    {
      id: "quimica",
      name: "Ingeniería Química",
      short: "Química",
      materias: [
        { id: "balmass", name: "Balances de Materia y Energía", profesor: "Dra. Irene Paredes", temas: [
          { id: "t1", title: "TEMA 1. Balances sin reacción", nodos: [
            { id: "n1", title: "1.1. Sistemas abiertos" },
            { id: "n2", title: "1.2. Reciclo y purga" }
          ]}
        ]},
        { id: "reactores", name: "Ingeniería de Reactores", profesor: "Dr. Felipe Cordero", temas: [
          { id: "t1", title: "TEMA 1. Cinética química", nodos: [
            { id: "n1", title: "1.1. Orden de reacción" },
            { id: "n2", title: "1.2. Reactores ideales" }
          ]}
        ]}
      ]
    },
    {
      id: "ambiental",
      name: "Ingeniería Ambiental",
      short: "Ambiental",
      materias: [
        { id: "aguas", name: "Tratamiento de Aguas", profesor: "Ing. Marina Quiroga", temas: [
          { id: "t1", title: "TEMA 1. Calidad del agua", nodos: [
            { id: "n1", title: "1.1. Parámetros fisicoquímicos" },
            { id: "n2", title: "1.2. Contaminantes prioritarios" }
          ]}
        ]},
        { id: "residuos", name: "Gestión de Residuos", profesor: "Ing. Sebastián Prado", temas: [
          { id: "t1", title: "TEMA 1. Jerarquía de residuos", nodos: [
            { id: "n1", title: "1.1. Reducir, reutilizar, reciclar" },
            { id: "n2", title: "1.2. Vertederos y valorización" }
          ]}
        ]}
      ]
    },
    {
      id: "biomedica",
      name: "Ingeniería Biomédica",
      short: "Biomédica",
      materias: [
        { id: "bioinstrumentacion", name: "Bioinstrumentación", profesor: "Dra. Nadia Flores", temas: [
          { id: "t1", title: "TEMA 1. Sensores biomédicos", nodos: [
            { id: "n1", title: "1.1. Electrodos y biopotenciales" },
            { id: "n2", title: "1.2. Adquisición de señales" }
          ]}
        ]},
        { id: "imagenes", name: "Imágenes Médicas", profesor: "Dr. Omar Beltrán", temas: [
          { id: "t1", title: "TEMA 1. Modalidades de imagen", nodos: [
            { id: "n1", title: "1.1. Rayos X y CT" },
            { id: "n2", title: "1.2. Resonancia magnética" }
          ]}
        ]}
      ]
    },
    {
      id: "sistemas",
      name: "Ingeniería en Sistemas",
      short: "Sistemas",
      materias: [
        { id: "mate1", name: "Matemática 1 Anual", profesor: "Cátedra Matemática · UTDT", temas: [
          { id: "t-limites", title: "UNIDAD. Límites (Práctica 3)", nodos: [
            { id: "n1", title: "1.1. Límites desde el gráfico de f" },
            { id: "n2", title: "1.2. Composición f ∘ g y enunciados V/F" },
            { id: "n3", title: "1.3. Más límites desde gráficos" },
            { id: "n4", title: "1.4. Función con dominio restringido" },
            { id: "n5", title: "1.5. Cálculo algebraico de límites" },
            { id: "n6", title: "1.6. Constante a y límites con raíces" },
            { id: "n7", title: "1.7. Límites laterales con valor absoluto" },
            { id: "n8", title: "1.8. Función definida por partes" },
            { id: "n9", title: "1.9. Laterales en x → 0 y existencia" },
            { id: "n10", title: "1.10. Propiedades básicas de límites" },
            { id: "n11", title: "1.11. Práctica 3 · material (PDF)" }
          ]}
        ]},
        { id: "requisitos", name: "Ingeniería de Requisitos", profesor: "Ing. Patricia Vega", temas: [
          { id: "t1", title: "TEMA 1. Elicitación", nodos: [
            { id: "n1", title: "1.1. Entrevistas y workshops" },
            { id: "n2", title: "1.2. Historias de usuario" }
          ]}
        ]},
        { id: "arquitectura", name: "Arquitectura de Software", profesor: "Ing. Martín Aguirre", temas: [
          { id: "t1", title: "TEMA 1. Estilos arquitectónicos", nodos: [
            { id: "n1", title: "1.1. Capas y microservicios" },
            { id: "n2", title: "1.2. Event-driven" }
          ]}
        ]},
        { id: "agile", name: "Gestión Ágil de Proyectos", profesor: "Lic. Rocío Medina", temas: [
          { id: "t1", title: "TEMA 1. Scrum", nodos: [
            { id: "n1", title: "1.1. Roles y ceremonias" },
            { id: "n2", title: "1.2. Backlog y sprints" }
          ]}
        ]}
      ]
    }
  ],
  events: [
    { date: "2026-09-23", time: "18:00", title: "Clase en vivo · Algoritmos" },
    { date: "2026-09-25", time: "19:30", title: "Entrega · Bases de Datos" },
    { date: "2026-09-28", time: "17:00", title: "Tutoría · Estática" }
  ]
};
