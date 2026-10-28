# Analizador privado

El analizador se publica en `/admin/analizador/`, protegido por Netlify Identity y rol admin. La entrada es `/admin/`.

Consultar [Configuración del acceso](admin-acceso.md). La contraseña compartida anterior ya no se utiliza. Las rutas /privado/ redirigen a /admin/.

## Modos de análisis

- **Un equipo:** permite combinar mercado, línea, temporadas y condición de local o visitante. En los mercados de equipo se puede medir el dato a favor o el que concedió al rival.
- **Un encuentro:** compara al local usando sus partidos anteriores como local y al visitante usando sus partidos anteriores como visitante. El selector de cada club abre su muestra completa en verde y rojo. Los partidos posteriores al encuentro elegido nunca entran en el cálculo.
