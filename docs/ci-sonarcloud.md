# SonarCloud — frontend_gastosmobile

## Error «Set the SONAR_TOKEN env variable»

El workflow [.github/workflows/sonarcloud.yml](../.github/workflows/sonarcloud.yml) necesita un token de SonarCloud en GitHub Actions.

## Configuración (una vez)

1. Entra en [SonarCloud](https://sonarcloud.io) con la cuenta GitHub **abelserradev**.
2. **My Account → Security → Generate Tokens** → copia el token (no se vuelve a mostrar).
3. Importa el repo si no existe:
   - **+ → Analyze new project → From GitHub → `frontend_gastosmobile`**
   - Project key esperado: `abelserradev_frontend_gastosmobile` (ver [sonar-project.properties](../sonar-project.properties)).
4. En GitHub: **Settings → Secrets and variables → Actions → New repository secret**
   - Name: `SONAR_TOKEN`
   - Value: el token de SonarCloud

5. Re-ejecuta el workflow fallido (**Actions → SonarCloud → Re-run jobs**).

## Comportamiento en CI

| Secret `SONAR_TOKEN` | Tests + cobertura | Escaneo SonarCloud |
|----------------------|-------------------|--------------------|
| No definido          | Sí                | Omitido (warning)  |
| Definido             | Sí                | Sí                 |

Cuando el token exista, conviene que el Quality Gate en SonarCloud esté en verde antes de mergear cambios grandes.
