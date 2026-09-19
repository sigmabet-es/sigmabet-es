# Analizador privado

El analizador se publica en `/privado/analizador/` y toda la ruta `/privado/*` está protegida por una Netlify Edge Function.

## Configuración en Netlify

1. Crear la variable de entorno `PROTECTED_ANALYZER_PASSWORD` con una contraseña larga y exclusiva.
2. Desplegar la rama que contiene `netlify.toml` y `netlify/edge-functions/private-analyzer.js`.
3. Abrir `https://sigmabet.es/privado/analizador/` y comprobar que aparece el formulario de acceso.

La sesión dura 12 horas. El enlace «Cerrar sesión» elimina la cookie inmediatamente. Si la variable no existe, la función devuelve un error 503 y no sirve el analizador.

La ruta envía `noindex`, `nofollow`, `noarchive`, `no-store` y no aparece en la navegación ni en los sitemaps públicos.

## Modos de análisis

- **Un equipo:** permite combinar mercado, línea, temporadas y condición de local o visitante. En los mercados de equipo se puede medir el dato a favor o el que concedió al rival.
- **Un encuentro:** compara al local usando sus partidos anteriores como local y al visitante usando sus partidos anteriores como visitante. El selector de cada club abre su muestra completa en verde y rojo. Los partidos posteriores al encuentro elegido nunca entran en el cálculo.
