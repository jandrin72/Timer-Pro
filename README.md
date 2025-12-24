# ⏱️ Timer Pro - Advanced Workout Timer App

<div align="center">

![Timer Pro](https://img.shields.io/badge/Timer-Pro-3b82f6?style=for-the-badge)
![Version](https://img.shields.io/badge/version-2.0-22c55e?style=for-the-badge)
![Languages](https://img.shields.io/badge/languages-7-f59e0b?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-8b5cf6?style=for-the-badge)

**Una aplicación web progresiva completa para entrenamientos de alta intensidad**

[🚀 Demo en Vivo](https://alejandrorodri80.github.io/Timer-Pro/) • [📖 Documentación](#-características-principales) • [🤝 Contribuir](#-contribuciones)

</div>

---

## 🎯 Características Principales

### 🔥 Timers Especializados

| Timer | Descripción | Uso Ideal |
|-------|-------------|-----------|
| **EMOM** | Every Minute On the Minute | CrossFit, functional training |
| **Tabata** | 20s trabajo / 10s descanso | HIIT, cardio intenso |
| **For Time** | Completa el trabajo lo más rápido posible | WODs con time cap |
| **AMRAP** | As Many Rounds As Possible | Circuitos de resistencia |

### 👤 Sistema de Perfiles (Próximamente)

- ✅ Gestión de múltiples usuarios independientes
- ✅ Datos personales completos (edad, sexo, objetivos)
- ✅ Almacenamiento separado por perfil
- ✅ Preparado para integración con IA

### 🎨 Experiencia de Usuario

- 🌍 **7 idiomas**: Español, English, Deutsch, Français, Italiano, Português, 中文
- 🌓 **Temas**: Modo claro y oscuro con transiciones suaves
- 📱 **Responsive**: Diseño optimizado para móviles y tablets
- 🔊 **Audio**: Sistema de notificaciones sonoras personalizables
- 📊 **Historial**: Seguimiento detallado con RPE y notas
- 💾 **Presets**: Guarda tus configuraciones favoritas
- 📤 **Exportar**: Datos a Excel con escalas RPE traducidas

---

## 📸 Capturas de Pantalla

<div align="center">
  <img src="screenshots/home.png" alt="Pantalla Principal" width="30%">
  <img src="screenshots/timer.png" alt="Timer EMOM" width="30%">
  <img src="screenshots/history.png" alt="Historial" width="30%">
</div>

---

## 🚀 Inicio Rápido

### Instalación

```bash
# Clonar el repositorio
git clone https://github.com/alejandrorodri80/Timer-Pro.git

# Navegar al directorio
cd Timer-Pro

# Abrir en el navegador
open index.html
```

**No requiere instalación de dependencias ni servidor.** Solo abre `index.html` en tu navegador.

### Configurar el Coach IA (Perplexity Sonar)

1. Crea una API Key en [Perplexity](https://www.perplexity.ai/).
2. Abre la consola del navegador y guarda tu key en `localStorage`:
   ```js
   localStorage.setItem('perplexity_api_key', 'pplx-XXXXX');
   ```
   (También puedes editar `src/utils/aiTrainerChat.js` y asignarla en `PERPLEXITY_API_KEY`).
3. Abre el chat (botón 💬) y conversa con el coach.

### Uso Básico

1. **Selecciona tu idioma** desde el header
2. **Elige un timer** (EMOM, Tabata, For Time, AMRAP)
3. **Configura parámetros** o usa presets rápidos
4. **¡Entrena!** Con notificaciones visuales y sonoras

---

## 📁 Estructura del Proyecto

```
Timer-Pro/
├── index.html                  # Punto de entrada
├── app.js                      # Controlador principal
├── styles.css                  # Estilos globales
├── README.md                   # Esta documentación
└── src/
    ├── styles/
    │   ├── main.css           # Variables y estilos base
    │   ├── components.css     # Componentes UI
    │   ├── themes.css         # Sistema de temas
    │   └── responsive.css     # Media queries
    └── utils/
        ├── storage.js         # Gestión de localStorage
        ├── audio.js           # Sistema de audio
        ├── translations.js    # Multi-idioma (7 idiomas)
        ├── helpers.js         # Funciones auxiliares
        ├── wakeLock.js        # Mantener pantalla activa
        └── profiles.js        # Gestión de perfiles (próximo)
```

---

## 🛠️ Tecnologías

- **HTML5** - Estructura semántica
- **CSS3** - Variables CSS, Grid, Flexbox
- **JavaScript (ES6+)** - Vanilla JS, sin frameworks
- **Web APIs**:
  - Web Audio API (sonidos)
  - Screen Wake Lock API (pantalla activa)
  - Web Share API (compartir resultados)
  - localStorage (persistencia)

---

## ✨ Funcionalidades Detalladas

### Timer EMOM

- Ciclos configurables (1-60 minutos)
- Sonidos distintos para trabajo/descanso
- Visualización de progreso en tiempo real
- Presets rápidos (5, 10, 20, 30 min)

### Timer Tabata

- Rondas personalizables (1-20)
- Ratio trabajo/descanso ajustable
- Sonido especial en última ronda
- Contador de progreso visual

### Timer For Time

- Time cap ajustable
- Sistema de laps para seguimiento
- Sonido de victoria al completar
- Historial de tiempos personales

### Timer AMRAP

- Duración personalizable
- Contador de rondas en tiempo real
- Análisis de pace por ronda
- Estadísticas de rendimiento

### Sistema de Presets

- Guardar configuraciones con nombre
- Editar y eliminar presets
- Aplicar en un click
- Organizado por tipo de timer

### Historial de Entrenamientos

- Registro automático de sesiones completadas
- **RPE** (Rate of Perceived Exertion) por timer:
  - EMOM: Escala 4-10
  - Tabata: Escala 6-10
  - For Time: Escala 5-10
  - AMRAP: Escala 5-10
- Notas personalizadas
- Estadísticas globales
- Compartir resultados
- Exportar a Excel

---

## 🌐 Idiomas Soportados

| Idioma | Código | Estado |
|--------|--------|--------|
| Español | `es` | ✅ 100% |
| English | `en` | ✅ 100% |
| Deutsch | `de` | ✅ 100% |
| Français | `fr` | ✅ 100% |
| Italiano | `it` | ✅ 100% |
| Português | `pt` | ✅ 100% |
| 中文 | `zh` | ✅ 100% |

---

## 🔮 Roadmap

### Versión 2.1 (En desarrollo)
- [ ] Sistema de perfiles con formularios completos
- [ ] Datos personales (edad, sexo, objetivos, experiencia)
- [ ] Preferencias de entrenamiento
- [ ] Almacenamiento independiente por perfil

### Versión 2.2 (Planificado)
- [ ] Integración con entrenador de IA
- [ ] Recomendaciones personalizadas
- [ ] Análisis de progresión
- [ ] Sugerencias de intensidad basadas en RPE

### Versión 3.0 (Futuro)
- [ ] PWA completa con Service Worker
- [ ] Modo offline
- [ ] Sincronización en la nube
- [ ] Gráficos de progreso histórico
- [ ] Calendario de entrenamientos
- [ ] Integración con wearables

---

## 📊 Compatibilidad

| Navegador | Versión Mínima | Estado |
|-----------|----------------|--------|
| Chrome | 90+ | ✅ Totalmente compatible |
| Firefox | 88+ | ✅ Totalmente compatible |
| Safari | 14+ | ✅ Totalmente compatible |
| Edge | 90+ | ✅ Totalmente compatible |
| Opera | 76+ | ✅ Totalmente compatible |

---

## 🎨 Personalización

### Cambiar Tema por Defecto

```javascript
// En src/utils/storage.js
static DEFAULT_SETTINGS = {
  theme: 'night', // Cambiar a 'day'
  volume: 0.8,
  keepScreenOn: true,
  language: 'es'
}
```

### Modificar Colores

```css
/* En src/styles/main.css */
:root {
  --primary: #3b82f6;    /* Color principal */
  --success: #22c55e;    /* Verde de éxito */
  --danger: #ef4444;     /* Rojo de peligro */
}
```

### Ajustar Límite de Historial

```javascript
// En src/utils/storage.js
static DEFAULT_HISTORY_LIMIT = 50; // Cambiar a tu preferencia
```

---

## 🔧 API de Almacenamiento

### Estructura de Datos

```javascript
// Configuración global
localStorage.get('app_settings')
// { theme, volume, keepScreenOn, language, activeProfile }

// Presets por timer
localStorage.get('emom_presets')
localStorage.get('tabata_presets')
// ... etc

// Historial por timer
localStorage.get('emom_history')
// [{ timestamp, duration, cycles, rpe, notes, ... }]

// Próximamente: Perfiles
localStorage.get('profiles_list')
localStorage.get('profile_<uuid>_data')
localStorage.get('profile_<uuid>_emom_presets')
```

---

## 🤝 Contribuciones

¡Las contribuciones son bienvenidas! Si quieres colaborar:

1. Fork el proyecto
2. Crea tu rama de feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add: nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

### Áreas de Mejora Prioritarias

- 🔴 Sistema de perfiles con formularios
- 🟠 Testing automatizado (Jest)
- 🟡 Optimización de bundle size
- 🟢 Documentación de API

---

## 📝 Convenciones de Código

- **Nombres de variables**: camelCase
- **Nombres de clases CSS**: kebab-case o BEM
- **Claves de traducción**: snake_case
- **IDs de elementos**: prefijo por timer (`emom_`, `tabata_`, etc.)
- **Comentarios**: En español, descriptivos

---

## 🐛 Reportar Bugs

Si encuentras un bug, por favor:

1. Verifica que no esté ya reportado en [Issues](https://github.com/alejandrorodri80/Timer-Pro/issues)
2. Abre un nuevo issue con:
   - Descripción clara del problema
   - Pasos para reproducir
   - Navegador y versión
   - Screenshots si aplica

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

---

## 💖 Soporte

Si esta aplicación te resulta útil, considera apoyar el desarrollo:

- ⭐ Dale una estrella al repositorio
- 🐛 Reporta bugs o sugiere mejoras
- 💵 [Donar por PayPal](https://www.paypal.me/alejandrorodri80)

---

## 👨‍💻 Autor

**Alejandro Rodríguez**

- GitHub: [@alejandrorodri80](https://github.com/alejandrorodri80)
- Web: [Timer Pro](https://alejandrorodri80.github.io/Timer-Pro/)

---

## 🙏 Agradecimientos

- A la comunidad de CrossFit por la inspiración
- A los usuarios beta testers por su feedback
- A todos los que han contribuido con traducciones

---

<div align="center">

**Timer Pro** - Desarrollado con ❤️ para la comunidad fitness

[⬆ Volver arriba](#️-timer-pro---advanced-workout-timer-app)

</div>
