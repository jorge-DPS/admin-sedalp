/**
 * Paleta Territorial Armonizada - Departamento de La Paz
 * Basada en el Manual Gráfico Oficial (Cobre, Azul Noche, Verde Territorial y Tierras)
 */
const palette = [
  '#A78A48', // 1. Altiplano Sur (Cobre Institucional)
  '#24334A', // 2. Altiplano Norte (Azul Noche)
  '#C29B38', // 3. Valles Interandinos Norte (Ocre)
  '#B25E35', // 4. Valles Interandinos Sur (Terracota)
  '#3D7847', // 5. Amazónica (Verde Amazónico)
  '#2D5D88', // 6. Metropolitana (Azul Andino)
  '#899251', // 7. Yungas (Verde Territorial Oficial)
]

export function regionColor(regionId: number): string {
  return palette[regionId - 1] ?? `hsl(${(regionId * 137.508) % 360} 65% 40%)`
}
