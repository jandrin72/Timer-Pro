# Timer Pro - Arquitectura Modular

## 📁 Estructura del Proyecto

```
TimerPro-Modular/
├── index-modular.html          # Punto de entrada principal
├── styles.css                  # CSS original (fallback)
├── app.js                      # JavaScript original (fallback)
├── README.md                   # Esta documentación
└── src/
    ├── styles/
    │   ├── main.css           # Variables CSS y estilos base
    │   ├── components.css     # Componentes principales
    │   ├── themes.css         # Temas claro/oscuro
    │   └── responsive.css     # Media queries
    └── utils/
        ├── storage.js         # Gestión de localStorage
        ├── audio.js           # Sistema de sonidos
        ├── translations.js    # Multi-idioma
        ├── helpers.js         # Funciones de ayuda
        └── wakeLock.js        # Control de pantalla
```

## 🚀 Cómo usar

1. **Abre `index-modular.html`** en tu navegador
2. La aplicación funcionará igual que antes
3. Ahora puedes modificar archivos específicos sin tocar todo el código

## ✅ Funcionalidades

- ✅ Timers: EMOM, Tabata, For Time, AMRAP
- ✅ Sistema de presets personalizados
- ✅ Historial de entrenamientos
- ✅ Multi-idioma (Español/Inglés)
- ✅ Temas claro/oscuro
- ✅ Audio y notificaciones
- ✅ Responsive design

## 🔧 Próximas mejoras

- [ ] Migrar componentes (Header, Modal, TabNavigation)
- [ ] Modularizar timers específicos
- [ ] Testing unitario
- [ ] Build system (Webpack/Vite)

## 📝 Notas

- Los archivos `styles.css` y `app.js` son fallbacks del original
- Las utilidades en `src/utils/` ya están funcionando
- El CSS está organizado en archivos lógicos
- Mantiene 100% de funcionalidad original
