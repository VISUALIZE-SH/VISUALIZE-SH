# Atlas layout options — October 15, 2026

Design research for [WOR-34](https://linear.app/workspace-visualize-sh/issue/WOR-34/evaluate-atlas-layouts-for-organic-condition-clusters-and-explicit).
Recommendation is a proposal; no renderer or clinical records were changed.
Luna inventoried the implementation; Sol researched layout capabilities and
visualization literature. The coordinating agent checked the material findings
against code, generated graph counts, official documentation, and original papers.

## Recommendation

Keep Cytoscape and develop **stable condition islands with explicit shared-target
labels**. Fix the condition anchors across filters, cluster therapies using only
their direct recorded `treats` links, and position shared therapies in the space
between their targets. Keep limited irregular spacing and collision relaxation
for an organic appearance. Show every shared therapy's condition abbreviations
beside its glyph; retain an exact list and highlighted links on selection.

Position should communicate approximate association, with explicit marks resolving
membership. Different target combinations can have the same centroid, and even a
two-target bridge can pass near an unrelated condition. No ordinary force layout
can guarantee that position alone communicates every arbitrary overlapping set.

## What Atlas actually does

The lockfile has Cytoscape 3.34.3, cytoscape-fcose 2.2.0, and d3-force 3.0.0.
The pipeline is already a hybrid, not an unstructured default force graph:

- [`layouts.ts`](../src/graph/layouts.ts), `getLayout`: randomized fCoSE seed.
- [`GraphCanvas.tsx`](../src/components/GraphCanvas.tsx), `declutterAndFit`:
  condition clustering, label relaxation, component spacing, final footprint
  separation, and viewport fit.
- [`clusterByCondition.ts`](../src/graph/clusterByCondition.ts),
  `associatedConditions`: undirected breadth-first traversal up to three hops,
  including company and trial connections. Condition weights fall by hop count;
  satellites target a weighted centroid plus a stable orbit offset. Shared nodes
  receive weaker attraction. Conditions are pinned within this pass only.
- Filters rerun layout on the visible subset. Subsequent spacing passes and
  elastic dragging can also move nodes. The result does not preserve a stable
  geographic meaning across interactions.

The generated `public/graph.json` currently contains 316 nodes and 475 edges:
21 conditions, 126 therapies (91 devices, 17 pharmaceuticals, 10 digital therapies,
8 procedures), 99 trials, and 70 companies. Nineteen therapies have two direct
`treats` links; none currently has more than two. These are database inventory
counts, not a verification of clinical indications.

[`palette.ts`](../src/graph/palette.ts) encodes entity type using fill and shape.
[`cytoscapeStyles.ts`](../src/graph/cytoscapeStyles.ts) maps size to degree and
label prominence to pulse. Default edges share the same pale appearance, despite
their different meanings. Borders already communicate draft and lifecycle state.

The important ambiguity is semantic: a path through a company's other product or
a trial can pull a therapy toward a condition that it does not directly target.
Changing force strength alone will not resolve this.

## Four visual directions

| Direction | Appearance and shared membership | Fit and tradeoff |
| --- | --- | --- |
| **1. Stable organic islands — recommended** | Persistent labeled condition hubs, irregular therapy satellites, and shared therapies on bridges. Short target abbreviations remain visible on shared nodes. Companies/trials become optional detail. | Moderate work within the existing stack. Best balance of organic appearance, spatial memory, and exact membership. Position remains approximate. |
| **2. Overlapping territories** | Bubble Sets or Kelp-style contours enclose the actual therapy members of each condition. Shared nodes belong to multiple contours. | A ready Cytoscape Bubble Sets extension exists, but compatibility/performance need testing. Organic appearance; many overlapping fills or long connecting necks can obscure membership. Prefer selected sets to all 21 simultaneously. |
| **3. Condition lines and interchange nodes** | LineSets/MetroSets inspiration: one labeled route per condition, therapies as stops, and shared therapies as interchanges. Curved LineSets can preserve more irregularity than a schematic metro map. | Stronger explicit membership than centroid position. Larger routing/labeling effort; crossings need a clear non-junction treatment. Routes must be explained as membership, not treatment sequence or therapy-to-therapy edges. |
| **4. Organic map plus membership matrix** | Keep the map; synchronize it with therapy rows and condition columns. Mark every recorded relationship. Add UpSet-style intersection counts only if aggregate questions become important. | Clearest exact comparison; moderate additional UI. A companion to the map, rather than the desired organic overview by itself. An empty cell means no recorded relationship, not proven absence of clinical effect. |

These are design judgments informed by the cited techniques, not measured Atlas
usability results. Relative effort estimates have not been benchmarked.

## Library implications and visual rules

fCoSE supports fixed node positions, horizontal/vertical alignment, and relative
placement constraints for simple nodes. Its API requires `quality: 'proof'` when
`randomize: false`; simply flipping randomization in the current default-quality
configuration is not a complete incremental-layout implementation. D3 exposes
per-node position targets and strengths plus fixed `fx`/`fy` anchors. Either can
support the recommended design; refining the existing D3 semantic pass offers
the most direct control. The centroid encoding itself is our proposal, not an
off-the-shelf feature [S1–S3].

Cytoscape's compound hierarchy assigns a node one parent. It is useful for
exclusive nested grouping, but cannot directly represent a therapy belonging to
several condition containers. Overlapping membership needs links, glyphs, an
overlay, or deliberately synchronized duplicate views [S4].

Preserve the current type shapes/fills and draft/lifecycle borders. Use separate
short text markers for target membership; do not ask users to distinguish 21
condition colors. Emphasize direct treatment links; distinguish or reveal trial
and manufacturer links on demand. Condition labels should remain visible at
overview zoom. Keep label collision handling constrained to avoid undoing the
semantic layout. Stable positions should survive filtering and theme changes;
reflow can be an explicit action. Elastic dragging must respect or restore
anchors if position is to retain meaning.

Procedures are currently therapy nodes with their own condition targets.
[`build-data.ts`](../scripts/build-data.ts), the edge derivation block, emits only
`treats`, `made_by`, `evaluates`, and `studies`. It emits no device-to-procedure
membership. A procedure-centered view needs a separately curated typed relation
before it can group devices around procedures; a shared condition is insufficient.
Broad graph `treats` links also do not establish exact-version approval or efficacy.

## Documentary sources and locators

All sources below were retrieved October 15, 2026, with public access. Scope is
software/visualization methods, with no product generation, jurisdiction, or trial
cohort claims. No third-party figures or full texts are redistributed. Linked
figures are visual references only. Publication precision and access limits are
recorded here rather than added to clinical data.

| ID | Primary document, publisher/date, exact locator | Use and limit |
| --- | --- | --- |
| S1 | [fCoSE official README](https://github.com/iVis-at-Bilkent/cytoscape.js-fcose#documentation), i-Vis Lab, living documentation, undated; Documentation and API: constraint types, `quality`, `randomize`, `initialEnergyOnIncremental`. [Constraint demo](https://ivis-at-bilkent.github.io/cytoscape.js-fcose/demo/demo-constraint.html). | Supported constraints and incremental settings; not a promise of semantic clustering or spatial stability. |
| S2 | [Position forces](https://d3js.org/d3-force/position), D3/Observable, living documentation, undated; `forceX`, `forceY`, strength and target accessors. | Per-node target attraction; semantic targets must be computed by the application. |
| S3 | [Force simulations](https://d3js.org/d3-force/simulation), D3/Observable, living documentation, undated; `simulation.nodes`, `fx`/`fy`, `simulation.tick`, random source and custom forces. | Fixed anchors, static computation, and initialization; caching/filter policy remains application work. |
| S4 | [Cytoscape.js documentation](https://js.cytoscape.org/#notation/compound-nodes), living documentation, undated; Compound nodes, `nodes.move`, Style, UI extensions. | Parent hierarchy, styling, and extension discovery. [Bubble Sets extension](https://github.com/upsetjs/cytoscape.js-bubblesets), README Usage/API `addPath(nodes, edges, avoidNodes, options)`; existing integration route, untested in this checkout. |
| S5 | [Bubble Sets](https://pubmed.ncbi.nlm.nih.gov/19834166/), Collins, Penn, Carpendale; IEEE TVCG, 2009; DOI 10.1109/TVCG.2009.122, Abstract. | Isocontours overlay membership without rearranging the base visualization. Abstract reviewed; full PDF fetch exceeded browser size limit. |
| S6 | [LineSets](https://pubmed.ncbi.nlm.nih.gov/22034345/), Alper et al.; IEEE TVCG, December 2011; DOI 10.1109/TVCG.2011.186, Abstract. | Curves connect members of a set. Abstract reviewed; full PDF fetch exceeded size limit. Use DOI/PubMed metadata because the Microsoft landing-page metadata differs. |
| S7 | [KelpFusion original paper](https://www.microsoft.com/en-us/research/wp-content/uploads/2016/12/kelpfusion_tvcg2013.pdf), Meulemans et al.; IEEE TVCG, 2013; sections 2–3/Figure 2 and Conclusions. | Blends line and region representations; discusses overlap and future boundary-stability work. Relevant full-text sections inspected; no Atlas performance or usability guarantee. |
| S8 | [MetroSets original paper](https://arxiv.org/html/2008.09367), Jacobsen et al.; arXiv v2, May 13, 2021 (initial submission August 21, 2020); Abstract, sections 1.1, 2.1, 3, 5.2. | Sets as routes, members as stations, shared members as interchanges; schematic layout constraints and limitations. Relevant full-text sections inspected. |
| S9 | [UpSet original paper](https://sci.utah.edu/~vdl/papers/2014_infovis_upset.pdf), Lex et al.; IEEE TVCG, December 2014; section 3.1 Combination Matrix, Figures 1 and 4–5. | Intersection analysis and linked element detail. Relevant full-text sections inspected; simple therapy-by-condition matrix is an adaptation, not the UpSet intersection matrix itself. |
| S10 | [Extended LineSets](https://link.springer.com/article/10.1186/1753-6561-9-S6-S4), Paduano and Forbes; BMC Proceedings, August 13, 2015; Methods: Extending node-link diagrams with LineSets, Figures 1–2. | Biomedical precedent combining network topology with category membership and avoiding duplicated nodes. Methods reviewed. Interview-derived task statements and feedback are not used as evidence of effectiveness. |

## Suggested next deliverable and validation

Prototype direction 1 against a frozen sample containing all 19 shared-target
therapies, then compare it with a selected-set contour overlay from direction 2.
Ask users to identify every recorded target without opening the inspector, and
check for false inferred targets as well as missing targets. Measure position
changes across filters, label overlaps, and layout time; preserve draft/lifecycle
styling and check narrow screens, keyboard detail access, and reduced motion.

This research included independent code/count verification and documentary source
review. It did not include a rendered prototype, timing benchmark, dependency
compatibility test, clinical curation, or user study. Documentation validation:
local relative-link/content review and `git diff --check`; software tests are not
required for this documentation-only deliverable. Implementation is a separate
decision and deliverable.
