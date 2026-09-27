# Remesas Perú - Venezuela: Fórmulas de Cálculo

> Implementadas en `app/lib/tasaCalculo.ts` (Panel y Estadísticas) y en la función SQL
> `calcular_ganancia_operacion` (cierre diario, migración 0103). Las dos deben ser siempre iguales.

## Leyenda de Términos y Unidades

| Símbolo | Significado | Unidad |
|---|---|---|
| **Ms** | Monto en soles que el cliente deposita en Perú | PEN |
| **Tv** | Tasa de venta: bolívares que recibe el cliente por cada sol | VES/PEN |
| **Ta** | Tasa de adquisición: bolívares que compra el remesero con cada sol | VES/PEN |
| **C₁** | % de comisión del operador de Perú, **sobre la ganancia bruta** | Adimensional (0.20 = 20 %) |
| **C₂** | % de comisión del operador de Venezuela, **sobre la ganancia bruta** | Adimensional (0.20 = 20 %) |
| **B** | Bolívares que recibe el beneficiario | VES |
| **T** | Total de bolívares que se envían a Venezuela (beneficiario + comisión Vzla) | VES |
| **G₍bruta₎** | Ganancia bruta de la operación (antes de comisiones) | PEN |
| **C₁(PEN)** | Comisión del operador de Perú | PEN |
| **C₂(PEN)** | Comisión del operador de Venezuela | PEN |
| **C₂(VES)** | Comisión del operador de Venezuela, pagada en bolívares | VES |
| **G₍neta₎** | Ganancia neta del Operador principal (después de comisiones) | PEN |

**Regla:** Ta debe ser mayor que Tv. Si Tv ≥ Ta la operación deja pérdida.

---

## Fórmulas

### 1. Bolívares que recibe el beneficiario

B = Ms × Tv  → PEN × VES/PEN = **VES**

### 2. Ganancia bruta

G₍bruta₎ = Ms × (1 − Tv / Ta)  → **PEN**

Es lo cobrado (Ms) menos lo que cuesta comprar los bolívares del beneficiario (B ÷ Ta).

### 3. Comisión del operador de Perú

C₁(PEN) = G₍bruta₎ × C₁  → **PEN**

### 4. Comisión del operador de Venezuela

C₂(PEN) = G₍bruta₎ × C₂  → **PEN**

C₂(VES) = C₂(PEN) × Ta  → **VES** (lo que se le paga en bolívares)

### 5. Total a enviar a Venezuela

T = B + C₂(VES)  → **VES**

### 6. Ganancia neta del Operador principal

G₍neta₎ = G₍bruta₎ − C₁(PEN) − C₂(PEN) = G₍bruta₎ × (1 − C₁ − C₂)  → **PEN**

### 7. Porcentajes

%G₍bruta₎ = (1 − Tv / Ta) × 100

%G₍neta₎ = G₍neta₎ / Ms × 100

### Redondeo

Cada monto se redondea a céntimos antes de restar, para que G₍neta₎ = G₍bruta₎ − C₁(PEN) − C₂(PEN) cuadre exacto.

### Caso sin ganancia

Si G₍bruta₎ ≤ 0 (Tv ≥ Ta) no hay nada que repartir: C₁ y C₂ quedan en 0 y la pérdida la asume el Operador principal.

---

## Ejemplo

Ms = S/ 180 · Tv = 259 · Ta = 270 · C₁ = 20 % · C₂ = 20 %

| Concepto | Cálculo | Resultado |
|---|---|---|
| B | 180 × 259 | Bs 46,620.00 |
| G₍bruta₎ | 180 × (1 − 259/270) | S/ 7.33 |
| C₁(PEN) | 7.33 × 0.20 | S/ 1.47 |
| C₂(PEN) | 7.33 × 0.20 | S/ 1.47 |
| C₂(VES) | 1.47 × 270 | Bs 396.90 |
| T | 46,620 + 396.90 | Bs 47,016.90 |
| G₍neta₎ | 7.33 − 1.47 − 1.47 | S/ 4.39 |

## Verificación de Unidades

| Operación | Unidades |
|---|---|
| PEN × (VES/PEN) | VES |
| VES ÷ (VES/PEN) | PEN |
| Comisiones C₁, C₂ | Adimensional |
| PEN − PEN | PEN |
