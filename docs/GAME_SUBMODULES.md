# Recuperación de los cuatro juegos como submódulos

Seguimiento: [issue #5](https://github.com/SkuuIll/Prophet-Setup-DS/issues/5).

## Causa

El índice de Git contenía cuatro entradas de modo `160000` (gitlinks) sin archivo
`.gitmodules`. Git no podía determinar de dónde descargar el código al clonar
con submódulos ni durante ciertas operaciones de checkout. No hay que borrar
los gitlinks ni sustituirlos por juegos de procedencia desconocida.

## Fuentes y revisiones exactas

| Ruta | Repositorio original | Commit anclado |
| --- | --- | --- |
| `web/public/games/2048` | https://github.com/gabrielecirulli/2048 | `478b6ec346e3787f589e4af751378d06ded4cbbc` |
| `web/public/games/clumsybird` | https://github.com/ellisonleao/clumsy-bird | `fae3d487d5102af29fb3f78431cbd45e9b83aed3` |
| `web/public/games/hextris` | https://github.com/Hextris/hextris | `3f4847dc8fd7dab3d1c87e6324b9159d92fbd396` |
| `web/public/games/pacman` | https://github.com/mumuy/pacman | `8a96194f7cf0102db2d7f0e69450166beb1d7116` |

Los cuatro SHA se comprobaron contra los commits originales en GitHub.
También se verificó que cada revisión contiene `index.html`. Los archivos
de licencia, atribución y recursos de cada proyecto **permanecen en su
repositorio original**; no eliminarlos al distribuir ni modificar los juegos.
Revisar especialmente las obligaciones GPL de Clumsy Bird y Hextris y los
derechos de marca antes de publicarlos en un servicio público.

## Recuperación en una copia de ensayo

No ejecutar inicialmente en `/root/ProphetBot`: un cron existente puede
desplegar cambios de `main` automáticamente.

```bash
cd /root/ProphetBot-Revision
git status --short
# Sin cambios locales sin respaldar:
git fetch origin main
# En una copia nueva del commit propuesto, luego de cambiar a esa versión:
git submodule sync --recursive
git submodule update --init --recursive
node scripts/verify_game_submodules.js --require-checkout
```

Para clonar desde cero una revisión ya integrada:
```bash
git clone --recurse-submodules https://github.com/SkuuIll/Prophet-Setup-DS.git
cd Prophet-Setup-DS
node scripts/verify_game_submodules.js --require-checkout
```

Para revisar únicamente la coherencia del índice y el manifest, **sin
descargar submódulos**:
```bash
node scripts/verify_game_submodules.js
```

## Aceptación antes de producción

- Verificar salida OK para los cuatro checkouts.
- Servir los cuatro juegos desde el servidor web de ensayo y abrir sus rutas
  en navegador, incluyendo teclado/móvil y recursos estáticos.
- Revisar que el build y el despliegue incluyan el contenido de submódulos.
  `actions/checkout` **no los descarga automáticamente** sin configurar
  `submodules: true`; en ese caso inicializarlos explícitamente.
- Confirmar avisos de licencia de terceros, persistencia y carga de juegos.
- Mantener `main` y la VPS sin cambios hasta aprobar el ensayo.

Esta corrección repara la **configuración de Git**, no demuestra por sí sola
que los cuatro juegos funcionen en el navegador ni que el VPS los sirva.
