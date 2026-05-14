# Ancient Kemet: Egyptology Research Archive

## Project Overview
This project is an exhaustive digital scholarship archive focusing on Ancient Egypt (Kemet). It synthesizes academic Egyptological rigor (philology, archaeology, history) with deep esoteric and metaphysical analysis (Heka, Alchemy, Hermeticism).

The project is structured as a high-fidelity static wiki and research hub, emphasizing immersive "Ancient Future" aesthetics and book-length scholarly entries.

---

## Content Standards: The "Alchemy" Gold Standard
`wiki/alchemy.html` is the definitive template for **page structure, content depth, and analytical approach**. All wiki entries must match its level of detail and comprehensive sourcing.

### 1. Depth and Scope
- **STRICT MINIMUM:** All pages must be the length of a short book, exceeding a **strict minimum of 600 lines** of detailed content. 
- **VERIFICATION WORKFLOW:**
    1. **Pre-Check:** Execute `wc -l <filename>` before starting to assess the current state.
    2. **Target:** Aim for 800-1200 lines to ensure the 600-line threshold is comfortably and substantively met.
    3. **Post-Check:** Execute `wc -l <filename>` upon completion to verify the goal is met.
    4. **Iterative Passes:** Acknowledge that a single pass is insufficient for true verification; scholarship is an ongoing dialogue.
- **Structure:** Articles must include a Table of Contents with anchor links to at least 15-20 sub-sections/chapters.
- **Analytical Approach:** Integrate both academic archaeological data and esoteric/subjective perspectives. Treat topics such as Astrology, Alchemy, and Psychic Phenomena as legitimate areas of study while maintaining philological accuracy.
- **Deduplication and Modularity:** Ensure pages have no duplicate sections, including duplicate sections across pages. If multiple pages have the same duplicate section, create a new dedicated page for that section and link to it from the originating pages to maintain a clean, modular structure.

### 2. Internal Linking (Redirects)
- **Automatic Linking:** Every time an article mentions a subject that has its own page in the wiki, it **MUST** include a relative link to that page. 
- **Example:** A mention of "Thoth" in the *Ma'at and Isfet* page should link to `thoth-hermes.html`.
- **Format:** Use `<a href="filename.html" class="nl">Subject Name</a>`.

### 3. Hieroglyph Protocol (Gardiner Codes)
- **MANDATORY INCLUSION:** All technical Egyptian terms must be accompanied by their **Gardiner Sign List codes** (e.g., *ḥkꜣ* [Gardiner: ḥ-k-ȝ / V28-D28-G1]). This is required to mitigate Unicode hallucination and provide a clear roadmap for final glyph implementation.
- **Conversion:** Use `transliterator.html` to verify these codes. In the final HTML, provide the codes in a clear, consistent format alongside the transliteration.
- **hallucination Mitigation:** Do not attempt to "draw" or select Unicode hieroglyphs directly during the research/expansion phase; always work with Gardiner codes first.
- **RIGOROUS CROSS-REFERENCING:** All Gardiner signs and transliterations must be rigorously cross-referenced with authoritative material to ensure complete accuracy.
- **VERIFIED UNICODE:** **Any hieroglyphs surrounded by square brackets `[]` are to be treated as verified unicode hieroglyphs**.
- **PHILOLOGICAL RIGOR:** Rigorously research philology and terminology to use correct gardiner codes, including determinatives in the correct spots (as described in `hieroglyphs.html` and other authoritative works). Ensure phonetics and transliterations are rigorously cross-referenced and accurate.
- **GARDINER SIGN CODE FORMATTING:** **All gardiner signs must be added in `[Gardiner: <codes-separated-with-hyphens>]`**
- **HIEROGLYPH HEX VERIFICATION PROTOCOL:** 
    1.  When verifying existing glyphs, use `sed -n '<line_number>p' <file_path> | xxd` to inspect the raw UTF-8 bytes.
    2.  Identify the 4-byte sequences (e.g., `f0 93 90 8d`) and convert to Unicode codepoints.
    3.  Cross-reference these codepoints against `hieroglyph-unicode-list.html` to ensure the correct Gardiner sign is used (e.g., `U+1340D` is `Aa1`).
    4.  Verify against philological standards for the specific word (e.g., `mjw` uses `E13` or `mi+w` etc.).

### 4. Perpetual Refinement (No Status Lines)
- **MANDATE:** **"The project is never truly finished."**
- **No Completion Status:** No page should ever be considered "verified" or "complete" in its final state. True verification requires multiple passes from multiple researchers over time.
- **NO STATUS UPDATES:** You MUST NOT add status lines to the files (e.g., `ARCHIVE STATUS: COMPLETE`, `LINE_COUNT: 600+`, `VERIFIED_HEKA`). 
- **Rationale:** Content is frequently added after a "full" or "verified" status is declared, making such labels premature and technically inaccurate. The archive is a living entity of ongoing scholarship.

---

## Technical Conventions

### 1. Centralized CSS
- **Minimal Inline Styles:** HTML files must have minimal CSS.
- **`css/wiki-style.css`:** All new styling elements, classes, and page-specific themes (using `body[data-page="..."]`) must be added directly to this file. 
- **Consistency:** Maintain the "Digital Scribe" aesthetic (scanlines, specific typography, gold/cyan accents).

### 2. Header & Footer Requirements
- **Headers:** Must include the `.page-header` with a title, a transliterated subtitle (e.g., *ḥkꜣ*), and a primary source epithet.
- **Footers:** Must include the `.related-links` section and a "Resonance Integrity" status line.

### 3. Philological Rigor
- **Unicode Hieroglyphs:** Final output uses Unicode characters generated via Gardiner/MdC codes.
- **Transliteration:** Provide standard Egyptological transliteration for all key technical terms.

---

## Persona Guidance
- **Accuracy First:** Use the persona of a Senior Egyptologist/Researcher to maintain technical, historical, and linguistic accuracy. 
- **No Roleplay Fluff:** Avoid unnecessary conversational roleplay or "in-character" filler. The goal is professional, exhaustive scholarship.

---

## Key Files & Directories
- `/wiki/`: The core knowledge base and primary focus for expansion.
- `css/wiki-style.css`: The central stylesheet for the entire wiki.
- `transliterator.html`: Tool for generating Unicode hieroglyphs from Gardiner codes/MdC.
- `hieroglyph-unicode-list.html`: **Contains all Unicode 17.0 codepoints for hieroglyphs and acts as a definitive source.**
- `index.html`: The main archive hub.
- `hieroglyphs.html`: Symbolic decoding training module.
- `Ancient_Egypt_History_Magic_Hermeticism.md`: Foundational research overview.
