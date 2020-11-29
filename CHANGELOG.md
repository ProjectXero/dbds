# Changelog

## 1.0.0 (2020-11-29)

### Features

    * add options to enable/disable type gen (bf95288 (https://github.com/ProjectXero/dbds/commit/bf95288f296513144f2561923a2d0f97f727821c))
    * basic count query to reproduce existing behavior (02bbf59 (https://github.com/ProjectXero/dbds/commit/02bbf594b807c1aef55e67c00f1e431259a04bdf))
    * cli and generate command (ca0e563 (https://github.com/ProjectXero/dbds/commit/ca0e56394d45a6a4dc460731cd0515b83ce4497d))
    * delete query (ef7ff06 (https://github.com/ProjectXero/dbds/commit/ef7ff064e18eab93855cc774b09324c69606db76))
    * disable generation of certain database objects (faa663a (https://github.com/ProjectXero/dbds/commit/faa663ade9ebf7e2da10da8a19eeaab0d248c52c))
    * enable loading database url/schema from node-config (edc4e9a (https://github.com/ProjectXero/dbds/commit/edc4e9abcad4391715660792ca80ed614c5ada70))
    * first pass w/ basic features (8fe269b (https://github.com/ProjectXero/dbds/commit/8fe269b4dc91f2ee919d97a7aeced3a56856f109))
    * generate type objects (3782842 (https://github.com/ProjectXero/dbds/commit/3782842f8bcd2d626311b5f580fc525284a243f8))
    * groupBy, orderBy, and having clauses (b92f1a5 (https://github.com/ProjectXero/dbds/commit/b92f1a5ef53d707572f4fa0fc740321c0fd73fea))
    * import DBDataSource as-is from fallingfish (8e8b783 (https://github.com/ProjectXero/dbds/commit/8e8b7839f287a88cfe0cfee431c8da39f21902fd))
    * insert query (a4fcc45 (https://github.com/ProjectXero/dbds/commit/a4fcc45cbb2d850921aaffaa6ab94dad917ed24b))
    * insert type generation (9ee2258 (https://github.com/ProjectXero/dbds/commit/9ee22586d36af21cfc64a756d5bde7ebdff372a2))
    * overhaul DBDataSource (50ec4bc (https://github.com/ProjectXero/dbds/commit/50ec4bc8665dfeafc59893213668e7da7c509289))
    * query comments on database objects (46ad4c6 (https://github.com/ProjectXero/dbds/commit/46ad4c69245a18a8081b6dd1f3e5c112f3023668))
    * QueryBuilder with WHERE clause generation (22da2f2 (https://github.com/ProjectXero/dbds/commit/22da2f2b28f4b3ee9cdab4249a0dc753fa6c9c94))
    * select query builder with a single smoke test (3b415a3 (https://github.com/ProjectXero/dbds/commit/3b415a311b58c2b08662efa8a7405f953ea3ea2e))
    * stub bin command (d4e13ff (https://github.com/ProjectXero/dbds/commit/d4e13ff431a2957c241c95e259e332f59330433f))
    * update query (f3538d5 (https://github.com/ProjectXero/dbds/commit/f3538d5143395c83730fbb8fd0bdfc22173c3dd8))

### Bug Fixes

    * conditions stuff (59f18f4 (https://github.com/ProjectXero/dbds/commit/59f18f47e9e657a954eaa3475cf25045cee976d5))
    * correctly set expected default with one row (6c3953d (https://github.com/ProjectXero/dbds/commit/6c3953db64cee1258ac23430da777a16d0e3ef3f))
    * enable callers to properly disconnect db (5850fc3 (https://github.com/ProjectXero/dbds/commit/5850fc3ce87e347924b25ed8ff8fda56a3e4c28d))
    * implicit order dependency with custom types (6b52230 (https://github.com/ProjectXero/dbds/commit/6b52230df78e60188fa29f55a27432231fc281e2))
    * inverted hasDefault logic (444f875 (https://github.com/ProjectXero/dbds/commit/444f8750ef46f803ec6018631c732c8d6e5dc637))
    * LoaderFactory types (1019ae4 (https://github.com/ProjectXero/dbds/commit/1019ae4eba34dc138f1ddaf8e1a3d251effc2beb))
    * make pg-typegen executable (00182f6 (https://github.com/ProjectXero/dbds/commit/00182f6286f0b541026069b432d70cc24100e0b1))
    * move columnTypes to constructor arg (f179d89 (https://github.com/ProjectXero/dbds/commit/f179d89081f0a27bd3c5fd99ac77fecb331fa3c8))
    * only warn about unknown type once (0f56466 (https://github.com/ProjectXero/dbds/commit/0f56466ba4f168561f0fb4bd0d0765110a57c535))
    * orderBy ASC/DESC API (222833a (https://github.com/ProjectXero/dbds/commit/222833a045cfe91f62ece0bae838f64005ea0c30)), closes #3 (https://github.com/ProjectXero/dbds/issues/3)
    * pre-emptively stop removing comments from output (1495e35 (https://github.com/ProjectXero/dbds/commit/1495e359a0b52afbe79463142ee9a93c7d09afd6))
    * prefer udt_name over data_type for array elements (cfb9859 (https://github.com/ProjectXero/dbds/commit/cfb9859a39bf739df02dbc82f2cb199e0b72e516))
    * register table types (01cfd17 (https://github.com/ProjectXero/dbds/commit/01cfd17428b90117989558a2be63c065d468bece))
    * remove unnecessary declare keywords (d2086ca (https://github.com/ProjectXero/dbds/commit/d2086cae937f204e83f7831edf77f0c517bf3bd9))
    * require  or  for delete query (cc6d75b (https://github.com/ProjectXero/dbds/commit/cc6d75bb3b204d23faa809ccf6251ca1fc37c975))
    * update stuff i missed before (db10afd (https://github.com/ProjectXero/dbds/commit/db10afddcfe34934b7192af70d249412157fd35b))
