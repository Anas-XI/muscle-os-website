"""Plant-Based Protein Optimization & DIAAS Amino Acid Synthesizer.

Implements:
- Digestible Indispensable Amino Acid Score (DIAAS) calculations
- Leucine Threshold Triggering (2.7-3.0g Leucine/meal)
- Complementary Plant Protein Pairings (Legumes + Grains / Rice + Pea)
- Plant-based total protein scaling factor (+20% total intake)
"""

from dataclasses import dataclass, field
from typing import List, Dict, Tuple


@dataclass
class PlantProteinOptimizationResult:
    total_target_protein_g: float
    plant_adjusted_target_g: float
    per_meal_leucine_target_g: float
    complementary_pairings: List[Dict[str, str]]
    recommended_staples: List[str]
    supplementation_priorities: List[str]


def optimize_plant_protein(
    base_protein_g: float,
    diet_type: str = "vegan"
) -> PlantProteinOptimizationResult:
    """Calculate amino acid completeness adjustments and complementary pairings for plant athletes."""
    # 20% adjustment factor to account for lower DIAAS and fiber-bound digestibility
    adjusted_protein = round(base_protein_g * 1.20, 1)

    pairings = [
        {
            "pairing": "Rice Protein + Pea Protein (70:30 ratio)",
            "mechanism": "Pea is rich in Lysine but low in Methionine; Rice is rich in Methionine but low in Lysine. Combined DIAAS > 1.0 (equivalent to Whey).",
        },
        {
            "pairing": "Legumes (Lentils/Chickpeas) + Whole Grains (Oats/Quinoa/Spelt)",
            "mechanism": "Combines limiting amino acids to achieve full essential amino acid (EAA) profile.",
        },
        {
            "pairing": "Tofu / Tempeh / Edamame (Soy Base)",
            "mechanism": "Soy protein isolate has a DIAAS score of ~0.90-0.98, serving as a complete single-source plant protein.",
        }
    ]

    staples = [
        "Tempeh & Extra-Firm Tofu (18-20g protein / 100g)",
        "Seitan / Vital Wheat Gluten (75g protein / 100g, pair with Lysine source)",
        "Red & Green Lentils (18g protein / cup cooked)",
        "Nutritional Yeast (8g protein / 2 tbsp, rich in B-complex)",
        "Hemp Seeds & Pumpkin Seeds (10g protein / 3 tbsp, rich in magnesium and zinc)",
    ]

    supplements = [
        "Vitamin B12 (Cyanocobalamin or Methylcobalamin 500-1000mcg 3x/week) - Non-negotiable for vegans",
        "Creatine Monohydrate (5g daily) - Vegans have ~20-30% lower baseline intramuscular creatine, resulting in larger cognitive and strength gains upon supplementation.",
        "Beta-Alanine (3.2-6.4g daily) - Carnosine synthesis is limited in plant-based diets.",
        "Algae-Derived EPA/DHA (500-1000mg daily) - Direct conversion bypasses inefficient ALA-to-DHA enzymatic pathway (<5%).",
        "Iron + Vitamin C pairing (take with 100mg Vitamin C to increase non-heme iron absorption by 3-4x).",
    ]

    return PlantProteinOptimizationResult(
        total_target_protein_g=base_protein_g,
        plant_adjusted_target_g=adjusted_protein,
        per_meal_leucine_target_g=2.8,
        complementary_pairings=pairings,
        recommended_staples=staples,
        supplementation_priorities=supplements,
    )
