"""
Deterministic waste rules engine for ReCycleAI.

Provides deterministic disposal, recycling, and preparation recommendations
based on visual classification metadata (category, material, and label).
This module does NOT call external AI APIs, ensuring reliable and auditable rules.
"""

from typing import Dict, Any, Optional
from dataclasses import dataclass


@dataclass(frozen=True)
class DisposalGuidance:
    disposal_action: str
    preparation: str
    recyclable: bool
    reason: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "disposal_action": self.disposal_action,
            "preparation": self.preparation,
            "recyclable": self.recyclable,
            "reason": self.reason,
        }


# Canonical rules catalog for waste streams
RULES_CATALOG: Dict[str, DisposalGuidance] = {
    "plastic_rigid": DisposalGuidance(
        disposal_action="Recycle in Blue Bin (Dry Recyclables)",
        preparation="Empty remaining liquids, rinse thoroughly, crush container, and replace cap if attached.",
        recyclable=True,
        reason="Rigid consumer plastics (such as PET #1 and HDPE #2 bottles, jugs, and tubs) are widely recycled into new containers and polyester fiber.",
    ),
    "plastic_film": DisposalGuidance(
        disposal_action="General Waste / Soft Plastics Drop-off",
        preparation="Ensure free of food crumbs; bundle soft plastics together for designated supermarket collection points if available.",
        recyclable=False,
        reason="Thin plastic films, wrappers, and shopping bags tangle sorting machinery in standard municipal recycling facilities.",
    ),
    "plastic_polystyrene": DisposalGuidance(
        disposal_action="General Waste / Landfill",
        preparation="Break into compact pieces and secure in general waste bin to avoid windblown litter.",
        recyclable=False,
        reason="Expanded polystyrene (Styrofoam) is brittle, low-density, and generally not accepted in curbside recycling programs.",
    ),
    "paper_clean": DisposalGuidance(
        disposal_action="Recycle in Paper Bin / Dry Recyclables",
        preparation="Keep dry, remove plastic sleeves or heavy tape, and flatten sheets or booklets.",
        recyclable=True,
        reason="Clean and dry paper fibers can be re-pulped into new recycled paper products multiple times.",
    ),
    "paper_soiled": DisposalGuidance(
        disposal_action="General Waste / Organic Compost (if unlined)",
        preparation="Separate any clean, unsoiled paper portions for recycling; place greasy or wax-lined sections in waste.",
        recyclable=False,
        reason="Food grease, wax coatings, and moisture weaken cellulose fibers and spoil the water-based paper recycling process.",
    ),
    "cardboard_clean": DisposalGuidance(
        disposal_action="Recycle in Cardboard / Paper Recycling Bin",
        preparation="Remove excess plastic tape, bubble wrap, and polystyrene; flatten all cardboard boxes flat.",
        recyclable=True,
        reason="Clean corrugated cardboard and paperboard are high-value commodities easily remanufactured into shipping boxes.",
    ),
    "cardboard_soiled": DisposalGuidance(
        disposal_action="General Waste / Compost",
        preparation="Tear off clean top lids for recycling; place grease-soaked bases (e.g. greasy pizza box bottoms) in compost or waste.",
        recyclable=False,
        reason="Heavy grease cannot be separated from corrugated pulp fibers and ruins entire recycling batches.",
    ),
    "glass_container": DisposalGuidance(
        disposal_action="Recycle in Glass Bin / Designated Glass Drop-off",
        preparation="Rinse thoroughly, remove corks or non-glass closures (recycle metal lids with metals), and keep glass whole.",
        recyclable=True,
        reason="Container glass (bottles, jars) is 100% infinitely recyclable without any loss in chemical quality or structural integrity.",
    ),
    "glass_specialty": DisposalGuidance(
        disposal_action="General Waste / Specialized Drop-off",
        preparation="Wrap broken or treated glass securely in heavy paper or cloth to protect sanitation workers from injury.",
        recyclable=False,
        reason="Treated glass (mirrors, windows, Pyrex, ceramics, lightbulbs) has different melting properties that contaminate container glass furnaces.",
    ),
    "metal_cans": DisposalGuidance(
        disposal_action="Recycle in Metal / Dry Recyclables Bin",
        preparation="Rinse residue clean; press aluminum beverage cans flat; crush clean foil into a firm ball.",
        recyclable=True,
        reason="Metals such as aluminum and tin/steel cans are infinitely recyclable, saving up to 95% of energy compared to raw metal production.",
    ),
    "metal_scrap": DisposalGuidance(
        disposal_action="Scrap Metal Dealer / Municipal Transfer Facility",
        preparation="Drain any oils or fluids; transport larger hardware, pots, or pipes directly to scrap yards.",
        recyclable=True,
        reason="Large or heavy metal hardware requires industrial shredding and smelting equipment rather than curbside sorting bins.",
    ),
    "e_waste": DisposalGuidance(
        disposal_action="Specialized E-Waste Drop-off Center / Retail Take-back",
        preparation="Back up and wipe personal data, remove detachable batteries for separate handling, and bundle cords neatly.",
        recyclable=True,
        reason="Electronics contain recoverable precious metals (gold, silver, copper) as well as toxic compounds that must never enter landfills.",
    ),
    "organic_wet": DisposalGuidance(
        disposal_action="Green Bin / Organic Waste / Compost",
        preparation="Drain excess liquids; remove plastic stickers, twist ties, or non-biodegradable packaging before composting.",
        recyclable=True,
        reason="Organic kitchen and plant waste decomposes into nutrient-rich soil compost, diverting methane emissions from landfills.",
    ),
    "hazardous_waste": DisposalGuidance(
        disposal_action="Hazardous Waste Collection Point / Special Handling Facility",
        preparation="Keep in original leak-proof container, tape battery terminals (especially lithium), never mix chemicals or pour down drains.",
        recyclable=False,
        reason="Contains corrosive, toxic, flammable, or heavy-metal substances that cause fires and pollute groundwater if improperly disposed of.",
    ),
    "unknown_other": DisposalGuidance(
        disposal_action="General Waste / Consult Local Municipal Guidelines",
        preparation="Inspect product packaging for manufacturer recycling codes (#1-#7) or material labels before disposal.",
        recyclable=False,
        reason="Unable to determine safe material composition with certainty. Safe default disposal prevents recycling stream contamination.",
    ),
}


def _contains(text: str, *keywords: str) -> bool:
    """Helper to check if any keyword exists as a substring in the normalized text."""
    return any(kw in text for kw in keywords)


def evaluate_waste_rules(
    category: Optional[str] = None,
    material: Optional[str] = None,
    label: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Evaluates deterministic waste rules against detected classification attributes.
    Returns a dictionary containing:
      - disposal_action (str)
      - preparation (str)
      - recyclable (bool)
      - reason (str)
    """
    cat = (category or "").lower().strip()
    mat = (material or "").lower().strip()
    lbl = (label or "").lower().strip()

    combined = f"{cat} {mat} {lbl}".strip()

    # Empty, unknown, or non-physical items default safely
    if not combined or combined in ("unknown", "none", "null") or "digital" in combined or "non-physical" in combined:
        return RULES_CATALOG["unknown_other"].to_dict()

    # 1. PRIORITY 1: Hazardous Waste (batteries, chemicals, bulbs, paint, medical)
    hazardous_keywords = [
        "battery", "batteries", "lithium", "chemical", "pesticide", "insecticide",
        "paint", "varnish", "solvent", "motor oil", "bleach", "mercury", "fluorescent",
        "toxic", "poison", "biohazard", "medical waste", "syringe", "needle", "acid"
    ]
    if _contains(cat, "hazard") or _contains(mat, "hazard", "battery", "lithium") or _contains(combined, *hazardous_keywords):
        return RULES_CATALOG["hazardous_waste"].to_dict()

    # 2. PRIORITY 2: E-Waste (electronics, phones, cables, chargers, appliances)
    ewaste_keywords = [
        "electronic", "e-waste", "computer", "laptop", "phone", "smartphone",
        "tablet", "circuit", "pcb", "cable", "charger", "appliance", "microwave",
        "television", "headphone", "earphone", "keyboard", "mouse", "power supply",
        "remote control", "gadget", "printer"
    ]
    if _contains(cat, "electronic", "e-waste") or _contains(mat, "electronic", "circuit") or _contains(combined, *ewaste_keywords):
        return RULES_CATALOG["e_waste"].to_dict()

    # 3. PRIORITY 3: Organic / Wet Waste (food, vegetation, peels, scraps)
    organic_keywords = [
        "organic", "food", "fruit", "vegetable", "peel", "scraps", "compost",
        "coffee ground", "tea bag", "eggshell", "plant", "flower", "leaf",
        "leaves", "bread", "meat", "bone", "garden waste"
    ]
    if _contains(cat, "organic", "food", "wet") or _contains(mat, "organic", "food") or _contains(combined, *organic_keywords):
        return RULES_CATALOG["organic_wet"].to_dict()

    # 4. PRIORITY 4: Cardboard
    cardboard_keywords = ["cardboard", "corrugated", "carton", "shipping box", "pizza box", "paperboard"]
    if _contains(cat, "cardboard") or _contains(mat, "cardboard", "corrugated") or _contains(lbl, *cardboard_keywords):
        soiled_keywords = ["grease", "greasy", "soiled", "oil", "food residue", "dirty", "used pizza"]
        if _contains(combined, *soiled_keywords):
            return RULES_CATALOG["cardboard_soiled"].to_dict()
        return RULES_CATALOG["cardboard_clean"].to_dict()

    # 5. PRIORITY 5: Paper
    paper_keywords = ["paper", "newspaper", "magazine", "document", "sheet", "envelope", "notebook", "flyer"]
    if _contains(cat, "paper") or _contains(mat, "paper", "cellulose") or _contains(lbl, *paper_keywords):
        soiled_paper_keywords = [
            "grease", "greasy", "soiled", "oil", "food residue", "wax", "waxed",
            "thermal", "receipt", "tissue", "napkin", "paper towel", "parchment", "coffee cup"
        ]
        if _contains(combined, *soiled_paper_keywords):
            return RULES_CATALOG["paper_soiled"].to_dict()
        return RULES_CATALOG["paper_clean"].to_dict()

    # 6. PRIORITY 6: Glass
    if _contains(cat, "glass") or _contains(mat, "glass") or ("glass" in lbl and not _contains(cat, "plastic", "metal")):
        specialty_glass_keywords = [
            "mirror", "window", "pyrex", "tempered", "ceramic", "porcelain",
            "crystal", "eyeglass", "spectacle", "bulb", "windshield"
        ]
        if _contains(combined, *specialty_glass_keywords):
            return RULES_CATALOG["glass_specialty"].to_dict()
        return RULES_CATALOG["glass_container"].to_dict()

    # 7. PRIORITY 7: Metal
    metal_keywords = [
        "metal", "aluminum", "aluminium", "steel", "tin", "iron", "copper",
        "brass", "soda can", "tin can", "beverage can", "can", "foil"
    ]
    if _contains(cat, "metal") or _contains(mat, "metal", "aluminum", "aluminium", "steel", "tin", "copper", "iron") or _contains(combined, *metal_keywords):
        scrap_keywords = ["scrap", "pot", "pan", "cookware", "hardware", "pipe", "rod", "cutlery", "utensil"]
        if _contains(combined, *scrap_keywords):
            return RULES_CATALOG["metal_scrap"].to_dict()
        return RULES_CATALOG["metal_cans"].to_dict()

    # 8. PRIORITY 8: Plastic
    plastic_keywords = [
        "plastic", "pet", "polyethylene", "hdpe", "pvc", "ldpe", "polypropylene",
        "pp", "polystyrene", "polymer", "resin", "styrofoam"
    ]
    if _contains(cat, "plastic") or _contains(mat, "plastic", "pet", "hdpe", "pvc", "ldpe", "pp", "ps", "polymer") or _contains(combined, *plastic_keywords):
        # Polystyrene / Styrofoam
        if _contains(combined, "styrofoam", "polystyrene", "eps", "expanded polystyrene"):
            return RULES_CATALOG["plastic_polystyrene"].to_dict()
        # Soft / Film plastic
        film_keywords = [
            "film", "bag", "wrapper", "pouch", "packet", "bubble wrap",
            "shrink wrap", "cling wrap", "sachet", "straw", "grocery bag"
        ]
        if _contains(combined, *film_keywords):
            return RULES_CATALOG["plastic_film"].to_dict()
        # Rigid plastic container / bottle
        return RULES_CATALOG["plastic_rigid"].to_dict()

    # 9. PRIORITY 9: Unknown / Other (safe fallback)
    return RULES_CATALOG["unknown_other"].to_dict()
