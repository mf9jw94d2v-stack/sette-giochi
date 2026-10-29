/** The political world map, as loaded from ./world (generated). */
export interface PoliticalMap {
  /** Countries in seven colour groups: neighbours never share a group. */
  countries: readonly string[];
  /** [name in Italian, x, y, zoom from which to show it], biggest first. */
  labels: readonly (readonly [string, number, number, number])[];
}
