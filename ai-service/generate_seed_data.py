import json
import random

categories = {
    "handwoven saree": [
        (["cotton", "khadi", "simple", "daily wear"], 800, 1500),
        (["cotton", "zari", "border", "festive"], 1500, 3000),
        (["silk", "pure silk", "bridal", "heavy"], 5000, 12000),
        (["linen", "modern", "lightweight"], 2000, 4000),
        (["chanderi", "silk blend", "transparent"], 3000, 6000),
        (["banarasi", "brocade", "traditional"], 6000, 15000),
    ],
    "block-print textile": [
        (["cotton", "kurta", "floral", "sanganeri"], 600, 1200),
        (["bedsheet", "king size", "cotton", "jaipuri"], 1200, 2500),
        (["dupatta", "chiffon", "light", "indigo"], 400, 900),
        (["cushion cover", "set of 5", "home decor"], 500, 1000),
        (["scarf", "silk", "hand block", "ajrakh"], 800, 1800),
        (["fabric", "unstitched", "yardage", "dabu"], 300, 800),
    ],
    "terracotta pottery": [
        (["clay", "pot", "planter", "garden"], 200, 600),
        (["kulhad", "tea cup", "set of 6", "earthen"], 150, 400),
        (["vase", "decorative", "painted", "home decor"], 400, 1000),
        (["wall hanging", "wind chime", "rustic"], 300, 800),
        (["serving bowl", "glazed", "kitchen", "microwave safe"], 500, 1200),
        (["diya", "lamp", "festival", "set of 10"], 100, 300),
    ],
    "bamboo basketry": [
        (["bamboo", "basket", "storage", "woven"], 400, 900),
        (["cane", "tray", "serving", "kitchen"], 300, 700),
        (["laundry basket", "large", "eco-friendly", "lid"], 1000, 2500),
        (["planter stand", "rattan", "indoor", "decor"], 800, 1800),
        (["fruit bowl", "handwoven", "natural"], 200, 500),
        (["lamp shade", "pendant", "ceiling", "boho"], 600, 1500),
    ],
    "brass handicraft": [
        (["brass", "idol", "statue", "god", "pooja"], 1000, 5000),
        (["lamp", "diya", "traditional", "heavy"], 800, 2500),
        (["urlis", "decorative bowl", "floating candles"], 1500, 4000),
        (["bell", "hanging", "temple", "vintage"], 500, 1500),
        (["showpiece", "animal", "figurine", "antique finish"], 1200, 3000),
        (["kitchenware", "thali set", "dinnerware", "copper blend"], 2000, 6000),
    ],
    "wooden toys": [
        (["wood", "educational", "puzzle", "kids", "non-toxic"], 300, 800),
        (["stacking", "ring", "toddler", "channapatna"], 250, 600),
        (["rocking horse", "large", "play", "handcrafted"], 1500, 4000),
        (["spinning top", "lattu", "set of 3", "colors"], 150, 400),
        (["pull along", "animal toy", "wheels"], 400, 900),
        (["board game", "chess", "ludo", "carved"], 800, 2000),
    ],
    "jute products": [
        (["jute", "bag", "tote", "shopping", "eco-friendly"], 200, 600),
        (["rug", "carpet", "floor", "braided", "round"], 1000, 3000),
        (["placemat", "table", "dining", "set of 6"], 400, 1000),
        (["file folder", "office", "handmade", "stationery"], 150, 400),
        (["planter basket", "macrame", "hanging", "rope"], 300, 800),
        (["laptop sleeve", "padded", "zipper"], 500, 1200),
    ],
    "embroidered textile": [
        (["embroidery", "phulkari", "dupatta", "heavy", "wedding"], 1500, 4000),
        (["chikankari", "kurti", "cotton", "lucknowi"], 800, 2500),
        (["kantha", "quilt", "bed cover", "patchwork"], 2000, 5000),
        (["cushion cover", "mirror work", "gujarati", "set of 2"], 600, 1200),
        (["wall hanging", "toran", "door", "festive"], 400, 900),
        (["bag", "clutch", "zardozi", "party wear"], 1000, 2500),
    ],
    "leather crafts": [
        (["leather", "wallet", "mens", "genuine", "tooled"], 500, 1500),
        (["bag", "messenger", "laptop", "vintage", "goat leather"], 2000, 5000),
        (["journal", "diary", "handmade paper", "embossed"], 300, 800),
        (["footwear", "mojari", "jutti", "traditional"], 600, 1800),
        (["belt", "handcrafted", "buckle", "casual"], 400, 1000),
        (["backpack", "travel", "rugged", "large"], 2500, 6000),
    ],
    "stone carving": [
        (["stone", "marble", "coaster", "inlay work", "set of 4"], 500, 1200),
        (["statue", "buddha", "soapstone", "carved", "decor"], 1000, 3000),
        (["mortar and pestle", "khalbatta", "kitchen", "heavy"], 400, 1000),
        (["box", "jewelry box", "jaali work", "fretsaw"], 600, 1500),
        (["incense holder", "agarbatti stand", "ash catcher"], 200, 500),
        (["elephant", "showpiece", "undercut", "intricate"], 800, 2500),
    ],
}

dataset = []
for cat, items in categories.items():
    for (keywords, pmin, pmax) in items:
        dataset.append({
            "category": cat,
            "material_keywords": keywords,
            "price_min": pmin,
            "price_max": pmax
        })

with open("data/comparable_prices.json", "w", encoding="utf-8") as f:
    json.dump(dataset, f, indent=2, ensure_ascii=False)
