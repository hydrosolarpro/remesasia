\# Remesas Perú - Venezuela: Fórmulas de Cálculo

\## Leyenda de Términos

| Símbolo | Significado |

\|---------|-------------|

| \*\*Ms\*\* | Monto en soles que el cliente deposita en Perú |

| \*\*Tv\*\* | Tasa de venta en Perú (bolívares por cada sol que cobra el remesero al cliente) |

| \*\*Ta\*\* | Tasa de adquisición en Venezuela (bolívares por cada sol que paga el remesero para comprar bolívares) |

| \*\*C₁\*\* | Comisión del comisionista en Perú (ej: 0.02 = 2%) |

| \*\*C₂\*\* | Comisión del comisionista en Venezuela (ej: 0.02 = 2%) |

| \*\*B\*\* | Bolívares que recibe el beneficiario final en Venezuela |

| \*\*T\*\* | Total de bolívares que el remesero debe enviar a Venezuela (beneficiario + comisión Vzla) |

| \*\*C₂(VES)\*\* | Comisión del comisionista en Venezuela, en bolívares |

| \*\*C₂(PEN)\*\* | Comisión del comisionista en Venezuela, en soles (equivalente) |

| \*\*C₁(PEN)\*\* | Comisión del comisionista en Perú, en soles |

| \*\*G₍bruta₎\*\* | Ganancia bruta del remesero en soles (antes de comisiones) |

| \*\*G₍neta₎\*\* | Ganancia neta del remesero en soles (después de comisiones) |

| \*\*G₍comPerú₎\*\* | Ganancia del comisionista en Perú, en soles |

| \*\*G₍comVzlaVES₎\*\* | Ganancia del comisionista en Venezuela, en bolívares |

| \*\*G₍comVzlaPEN₎\*\* | Ganancia del comisionista en Venezuela, en soles (equivalente) |

| \*\*%G₍bruta₎\*\* | Porcentaje de ganancia bruta del remesero |

| \*\*%G₍neta₎\*\* | Porcentaje de ganancia neta del remesero |

\---




\## Fórmulas Principales (1 a 3)

\### 1. Bolívares que recibe el beneficiario

\[

B = Ms \times Tv

\]

\### 2. Total a enviar a Venezuela (beneficiario + comisión del comisionista Vzla)

\[

T = \frac{B}{1 - C\_2}

\]

\### 3. Comisión del comisionista en Venezuela (en bolívares)

\[

C\_{2(VES)} = T \times C\_2

\]

\---

\## Fórmulas Adicionales

\### 4. Comisión del comisionista en Venezuela (en soles)

\[

C\_{2(PEN)} = \frac{C\_{2(VES)}}{Ta}

\]

\### 5. Comisión del comisionista en Perú (en soles)

\[

C\_{1(PEN)} = Ms \times C\_1

\]

\### 6. Ganancia bruta del remesero (en soles)

\[

G\_{(bruta)} = Ms \times \left( \frac{Ta}{Tv} - 1 \right)

\]

\### 7. Ganancia neta del remesero (en soles)

\[

G\_{(neta)} = G\_{(bruta)} - C\_{1(PEN)} - C\_{2(PEN)}

\]

\### 8. Porcentaje de ganancia bruta

\[

\%G\_{(bruta)} = \left( \frac{Ta}{Tv} - 1 \right) \times 100

\]

\### 9. Porcentaje de ganancia neta

\[

\%G\_{(neta)} = \frac{G\_{(neta)}}{Ms} \times 100

\]

\### 10. Ganancia del comisionista en Perú (en soles)

\[

G\_{(comPerú)} = Ms \times C\_1

\]

\### 11. Ganancia del comisionista en Venezuela (en bolívares)

\[

G\_{(comVzlaVES)} = \frac{Ms \times Tv}{1 - C\_2} \times C\_2

\]

\### 12. Ganancia del comisionista en Venezuela (en soles)

\[

G\_{(comVzlaPEN)} = \frac{Ms \times Tv \times C\_2}{(1 - C\_2) \times Ta}

\]

\# Remesas Perú - Venezuela: Fórmulas de Cálculo

\## Leyenda de Términos y Unidades

| Símbolo | Significado | Unidad |

\|---------|-------------|--------|

| \*\*Ms\*\* | Monto en soles que el cliente deposita en Perú | \*\*PEN\*\* |

| \*\*Tv\*\* | Tasa de venta en Perú (bolívares por cada sol que cobra el remesero al cliente) | \*\*VES/PEN\*\* |

| \*\*Ta\*\* | Tasa de adquisición en Venezuela (bolívares por cada sol que paga el remesero para comprar bolívares) | \*\*VES/PEN\*\* |

| \*\*C₁\*\* | Comisión del comisionista en Perú | \*\*Adimensional\*\* (ej: 0.02 = 2%) |

| \*\*C₂\*\* | Comisión del comisionista en Venezuela | \*\*Adimensional\*\* (ej: 0.02 = 2%) |

| \*\*B\*\* | Bolívares que recibe el beneficiario final en Venezuela | \*\*VES\*\* |

| \*\*T\*\* | Total de bolívares que el remesero debe enviar a Venezuela | \*\*VES\*\* |

| \*\*C₂(VES)\*\* | Comisión del comisionista en Venezuela | \*\*VES\*\* |

| \*\*C₂(PEN)\*\* | Comisión del comisionista en Venezuela (equivalente en soles) | \*\*PEN\*\* |

| \*\*C₁(PEN)\*\* | Comisión del comisionista en Perú | \*\*PEN\*\* |

| \*\*G₍bruta₎\*\* | Ganancia bruta del remesero (antes de comisiones) | \*\*PEN\*\* |

| \*\*G₍neta₎\*\* | Ganancia neta del remesero (después de comisiones) | \*\*PEN\*\* |

| \*\*G₍comPerú₎\*\* | Ganancia del comisionista en Perú | \*\*PEN\*\* |

| \*\*G₍comVzlaVES₎\*\* | Ganancia del comisionista en Venezuela | \*\*VES\*\* |

| \*\*G₍comVzlaPEN₎\*\* | Ganancia del comisionista en Venezuela (equivalente en soles) | \*\*PEN\*\* |

| \*\*%G₍bruta₎\*\* | Porcentaje de ganancia bruta del remesero | \*\*%\*\* |

| \*\*%G₍neta₎\*\* | Porcentaje de ganancia neta del remesero | \*\*%\*\* |

\---

\## Fórmulas Principales (1 a 3)

\### 1. Bolívares que recibe el beneficiario

\[

B = Ms \times Tv

\]

\- \*\*Unidades:\*\* PEN × (VES/PEN) = \*\*VES\*\*

\### 2. Total a enviar a Venezuela (beneficiario + comisión del comisionista Vzla)

\[

T = \frac{B}{1 - C\_2}

\]

\- \*\*Unidades:\*\* VES / 1 = \*\*VES\*\*

\### 3. Comisión del comisionista en Venezuela (en bolívares)

\[

C\_{2(VES)} = T \times C\_2

\]

\- \*\*Unidades:\*\* VES × 1 = \*\*VES\*\*

\---

\## Fórmulas Adicionales

\### 4. Comisión del comisionista en Venezuela (en soles)

\[

C\_{2(PEN)} = \frac{C\_{2(VES)}}{Ta}

\]

\- \*\*Unidades:\*\* VES / (VES/PEN) = \*\*PEN\*\*

\### 5. Comisión del comisionista en Perú (en soles)

\[

C\_{1(PEN)} = Ms \times C\_1

\]

\- \*\*Unidades:\*\* PEN × 1 = \*\*PEN\*\*

\### 6. Ganancia bruta del remesero (en soles)

\[

G\_{(bruta)} = Ms \times \left( \frac{Ta}{Tv} - 1 \right)

\]

\- \*\*Unidades:\*\* PEN × [(VES/PEN)/(VES/PEN) - 1] = \*\*PEN\*\*

\### 7. Ganancia neta del remesero (en soles)

\[

G\_{(neta)} = G\_{(bruta)} - C\_{1(PEN)} - C\_{2(PEN)}

\]

\- \*\*Unidades:\*\* PEN - PEN - PEN = \*\*PEN\*\*

\### 8. Porcentaje de ganancia bruta

\[

\%G\_{(bruta)} = \left( \frac{Ta}{Tv} - 1 \right) \times 100

\]

\- \*\*Unidades:\*\* Adimensional × 100 = \*\*%\*\*

\### 9. Porcentaje de ganancia neta

\[

\%G\_{(neta)} = \frac{G\_{(neta)}}{Ms} \times 100

\]

\- \*\*Unidades:\*\* (PEN/PEN) × 100 = \*\*%\*\*

\### 10. Ganancia del comisionista en Perú (en soles)

\[

G\_{(comPerú)} = Ms \times C\_1

\]

\- \*\*Unidades:\*\* PEN × 1 = \*\*PEN\*\*

\### 11. Ganancia del comisionista en Venezuela (en bolívares)

\[

G\_{(comVzlaVES)} = \frac{Ms \times Tv}{1 - C\_2} \times C\_2

\]

\- \*\*Unidades:\*\* (PEN × VES/PEN) / 1 × 1 = \*\*VES\*\*

\### 12. Ganancia del comisionista en Venezuela (en soles)

\[

G\_{(comVzlaPEN)} = \frac{Ms \times Tv \times C\_2}{(1 - C\_2) \times Ta}

\]

\- \*\*Unidades:\*\* (PEN × VES/PEN × 1) / (1 × VES/PEN) = \*\*PEN\*\*

\---

\## Verificación de Unidades (Regla de Oro)

| Operación | Unidades |

\|-----------|----------|

| \*\*Soles (PEN)\*\* × \*\*Tasa (VES/PEN)\*\* | = \*\*VES\*\* |

| \*\*Bolívares (VES)\*\* ÷ \*\*Tasa (VES/PEN)\*\* | = \*\*PEN\*\* |

| \*\*Comisiones (C₁, C₂)\*\* | = \*\*Adimensional\*\* |

| \*\*PEN\*\* - \*\*PEN\*\* | = \*\*PEN\*\* |

| \*\*VES\*\* - \*\*VES\*\* | = \*\*VES\*\* |
