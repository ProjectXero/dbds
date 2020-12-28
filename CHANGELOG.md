### [1.5.1](https://github.com/ProjectXero/dbds/compare/v1.5.0...v1.5.1) (2020-12-28)


### Bug Fixes

* correct get types to allow forUpdate ([d526d07](https://github.com/ProjectXero/dbds/commit/d526d07ec490c48a6cb23a8a0155316af705594e))

## [1.5.0](https://github.com/ProjectXero/dbds/compare/v1.4.2...v1.5.0) (2020-12-28)


### Features

* support FOR UPDATE in select queries ([30a59ce](https://github.com/ProjectXero/dbds/commit/30a59ceffd0d30fed130d1150b8db6c885579801))


### Bug Fixes

* re-throw error after printing the message ([4879697](https://github.com/ProjectXero/dbds/commit/4879697949f7014f8d429762838baed53518d093))
* sort enum members alphabetically ([5c2cd88](https://github.com/ProjectXero/dbds/commit/5c2cd88e5d131d398584af49601cf9963b60118d)), closes [#63](https://github.com/ProjectXero/dbds/issues/63)

### [1.4.2](https://github.com/ProjectXero/dbds/compare/v1.4.1...v1.4.2) (2020-12-10)


### Bug Fixes

* pass options through to loaders ([0514a3c](https://github.com/ProjectXero/dbds/commit/0514a3ca8ccd96f5686f90de574b624d7d79d523))

### [1.4.1](https://github.com/ProjectXero/dbds/compare/v1.4.0...v1.4.1) (2020-12-05)


### Bug Fixes

* improve json/jsonb generics for functionality and readability ([523850a](https://github.com/ProjectXero/dbds/commit/523850ae5705dac2c09107563204300047e5cfe6)), closes [#48](https://github.com/ProjectXero/dbds/issues/48)
* parse timestamps in house ([1238371](https://github.com/ProjectXero/dbds/commit/123837105960abba9f045a541a616a5546ad2c0f)), closes [#45](https://github.com/ProjectXero/dbds/issues/45)
* remove extra options from count query ([0fc3e72](https://github.com/ProjectXero/dbds/commit/0fc3e7298ebea1c0d2a27da79915ac47a52c83cd)), closes [#47](https://github.com/ProjectXero/dbds/issues/47)

## [1.4.0](https://github.com/ProjectXero/dbds/compare/v1.3.0...v1.4.0) (2020-12-04)


### Features

* ability to set default options ([52a327a](https://github.com/ProjectXero/dbds/commit/52a327ae9142a4be2cb2e256dfd2caca2dcb5b4f))
* default options ([#46](https://github.com/ProjectXero/dbds/issues/46)) ([a19e12c](https://github.com/ProjectXero/dbds/commit/a19e12c6968af44cbaf9d0c6ec5c64984fe34457))

## [1.3.0](https://github.com/ProjectXero/dbds/compare/v1.2.5...v1.3.0) (2020-12-04)


### Features

* allow column type to be overridden ([9f82a6c](https://github.com/ProjectXero/dbds/commit/9f82a6cc9ea164b4481c20f3045ba3927f0b9f26))
* generate several utility types in prep for json/b support ([7df7056](https://github.com/ProjectXero/dbds/commit/7df70564615c30bc3118679a25375462309444af))
* improved key/column transformation ([975e6e9](https://github.com/ProjectXero/dbds/commit/975e6e981f225e03a90067ec9bb7fed5ec1e4ebe))
* stringify JSON objects ([abb6a5b](https://github.com/ProjectXero/dbds/commit/abb6a5b458e799cf7329384d4a517d8c6946bfe3))
* type parameters for json/b ([c47e13b](https://github.com/ProjectXero/dbds/commit/c47e13be378b4fdebb210afce686c3c4879d2ff4))

### [1.2.5](https://github.com/ProjectXero/dbds/compare/v1.2.4...v1.2.5) (2020-12-03)


### Bug Fixes

* **loaders:** types ([5f7601b](https://github.com/ProjectXero/dbds/commit/5f7601b7d2b6f4e15b4764bb39104167e4858563))

### [1.2.4](https://github.com/ProjectXero/dbds/compare/v1.2.3...v1.2.4) (2020-12-02)


### Bug Fixes

* insertOne/insertMany AllowSql ([8490f1c](https://github.com/ProjectXero/dbds/commit/8490f1c160de8e082c6fc697848c9338d04b38d7))
* insertOne/insertMany AllowSql ([#37](https://github.com/ProjectXero/dbds/issues/37)) ([4a52e86](https://github.com/ProjectXero/dbds/commit/4a52e86c6cacdde969e6805cf0763edad9931ee3))

### [1.2.3](https://github.com/ProjectXero/dbds/compare/v1.2.2...v1.2.3) (2020-12-02)


### Bug Fixes

* (more or less) return expected type when given zero rows to insert ([f81ee80](https://github.com/ProjectXero/dbds/commit/f81ee80cc5bc361bb07bed16036d6809eef780ae)), closes [#33](https://github.com/ProjectXero/dbds/issues/33)
* always return await for async functions ([57b7c4a](https://github.com/ProjectXero/dbds/commit/57b7c4aa1cee95082f4c1748a52068055e3e4b46))
* apparently CI can't handle ||= wat ([0aa6b80](https://github.com/ProjectXero/dbds/commit/0aa6b80f4ee3c4346999160dc0874b4f80f98248))
* handle the case of a single empty row ([6d6afcb](https://github.com/ProjectXero/dbds/commit/6d6afcb06fc36a5b49af672d9853edbec3e12b27)), closes [#34](https://github.com/ProjectXero/dbds/issues/34)
* make camel-cased column names work on insert ([6b2886c](https://github.com/ProjectXero/dbds/commit/6b2886c43b21bcd5961f108d35d2a3da72ab2186)), closes [#30](https://github.com/ProjectXero/dbds/issues/30)
* only override expected if it's not set ([e9ef675](https://github.com/ProjectXero/dbds/commit/e9ef675b424a26ca9e9a340f08922ce2a10ed74e)), closes [#32](https://github.com/ProjectXero/dbds/issues/32)
* parenthesis fail... and also logic fail ([1a03238](https://github.com/ProjectXero/dbds/commit/1a03238465d310368678564b4c34c3022860be29))

### [1.2.2](https://github.com/ProjectXero/dbds/compare/v1.2.1...v1.2.2) (2020-12-01)


### Bug Fixes

* allow insertion of non-uniform rows ([a4af9ab](https://github.com/ProjectXero/dbds/commit/a4af9ab77f798c61140410f5e572120d5b8feeb5)), closes [#28](https://github.com/ProjectXero/dbds/issues/28)
* allow raw sql in inserts ([a8c94ca](https://github.com/ProjectXero/dbds/commit/a8c94ca37c9b754869f5d4c3b73d106f1d7eaba1)), closes [#27](https://github.com/ProjectXero/dbds/issues/27)

### [1.2.1](https://github.com/ProjectXero/dbds/compare/v1.2.0...v1.2.1) (2020-12-01)


### Bug Fixes

* add RETURNING clause to INSERT query ([80a703e](https://github.com/ProjectXero/dbds/commit/80a703e387026d4c4d0f87435df0707aa18b0773)), closes [#24](https://github.com/ProjectXero/dbds/issues/24)
* pass through options in update ([ec891c0](https://github.com/ProjectXero/dbds/commit/ec891c0d5d7337bb0c2f145a3a2a783412d9bcbe)), closes [#23](https://github.com/ProjectXero/dbds/issues/23)

## [1.2.0](https://github.com/ProjectXero/dbds/compare/v1.1.0...v1.2.0) (2020-12-01)


### Features

* support Date objects ([f671230](https://github.com/ProjectXero/dbds/commit/f6712302b5e9dae55fb5104347a559a79c4e55f1)), closes [#19](https://github.com/ProjectXero/dbds/issues/19)
* support LIMIT clause ([4684631](https://github.com/ProjectXero/dbds/commit/46846311de2ee37b3c7dd68079955177ca22cce2)), closes [#18](https://github.com/ProjectXero/dbds/issues/18)


### Bug Fixes

* allow 'undefined' for values in update/where ([8ec3fec](https://github.com/ProjectXero/dbds/commit/8ec3fecb98f4e22a0c3b9fb464ffe432be0c5770)), closes [#17](https://github.com/ProjectXero/dbds/issues/17)
* columnType is optional ([09c0362](https://github.com/ProjectXero/dbds/commit/09c0362b2e5aff1cf6af97ba96c5370dbad58102)), closes [#2](https://github.com/ProjectXero/dbds/issues/2)
* nullable fields are optional when inserting ([fba3e1c](https://github.com/ProjectXero/dbds/commit/fba3e1c6e043b7dcc625a807b6b8a8b059178f5f)), closes [#20](https://github.com/ProjectXero/dbds/issues/20)
* remove table identifier from UPDATE SET clause ([6dbf930](https://github.com/ProjectXero/dbds/commit/6dbf93086e32ebca0391fe9a2ad34244df9ac5f3))
* temporarily just snake case columns ([b2c7004](https://github.com/ProjectXero/dbds/commit/b2c7004d9cd0b45b07067a95c0c8f097f4881601)), closes [#21](https://github.com/ProjectXero/dbds/issues/21)

## [1.1.0](https://github.com/ProjectXero/dbds/compare/v1.0.0...v1.1.0) (2020-11-30)


### Features

* allow case tweaking ([cc31634](https://github.com/ProjectXero/dbds/commit/cc3163433a151c691ace020b395c0bf946f594a9)), closes [#1](https://github.com/ProjectXero/dbds/issues/1)


### Bug Fixes

* remove newline. it does nothing ([855b63f](https://github.com/ProjectXero/dbds/commit/855b63f6e0ad9db6d992c27def78403b711715ed))

## 1.0.0 (2020-11-29)

### Features

* add options to enable/disable type gen ([bf95288](https://github.com/ProjectXero/dbds/commit/bf95288f296513144f2561923a2d0f97f727821c))
* basic count query to reproduce existing behavior ([02bbf59](https://github.com/ProjectXero/dbds/commit/02bbf594b807c1aef55e67c00f1e431259a04bdf))
* cli and generate command ([ca0e563](https://github.com/ProjectXero/dbds/commit/ca0e56394d45a6a4dc460731cd0515b83ce4497d))
* delete query ([ef7ff06](https://github.com/ProjectXero/dbds/commit/ef7ff064e18eab93855cc774b09324c69606db76))
* disable generation of certain database objects ([faa663a](https://github.com/ProjectXero/dbds/commit/faa663ade9ebf7e2da10da8a19eeaab0d248c52c))
* enable loading database url/schema from node-config ([edc4e9a](https://github.com/ProjectXero/dbds/commit/edc4e9abcad4391715660792ca80ed614c5ada70))
* first pass w/ basic features ([8fe269b](https://github.com/ProjectXero/dbds/commit/8fe269b4dc91f2ee919d97a7aeced3a56856f109))
* generate type objects ([3782842](https://github.com/ProjectXero/dbds/commit/3782842f8bcd2d626311b5f580fc525284a243f8))
* groupBy, orderBy, and having clauses ([b92f1a5](https://github.com/ProjectXero/dbds/commit/b92f1a5ef53d707572f4fa0fc740321c0fd73fea))
* import DBDataSource as-is from fallingfish ([8e8b783](https://github.com/ProjectXero/dbds/commit/8e8b7839f287a88cfe0cfee431c8da39f21902fd))
* insert query ([a4fcc45](https://github.com/ProjectXero/dbds/commit/a4fcc45cbb2d850921aaffaa6ab94dad917ed24b))
* insert type generation ([9ee2258](https://github.com/ProjectXero/dbds/commit/9ee22586d36af21cfc64a756d5bde7ebdff372a2))
* overhaul DBDataSource ([50ec4bc](https://github.com/ProjectXero/dbds/commit/50ec4bc8665dfeafc59893213668e7da7c509289))
* query comments on database objects ([46ad4c6](https://github.com/ProjectXero/dbds/commit/46ad4c69245a18a8081b6dd1f3e5c112f3023668))
* QueryBuilder with WHERE clause generation ([22da2f2](https://github.com/ProjectXero/dbds/commit/22da2f2b28f4b3ee9cdab4249a0dc753fa6c9c94))
* select query builder with a single smoke test ([3b415a3](https://github.com/ProjectXero/dbds/commit/3b415a311b58c2b08662efa8a7405f953ea3ea2e))
* stub bin command ([d4e13ff](https://github.com/ProjectXero/dbds/commit/d4e13ff431a2957c241c95e259e332f59330433f))
* update query ([f3538d5](https://github.com/ProjectXero/dbds/commit/f3538d5143395c83730fbb8fd0bdfc22173c3dd8))

### Bug Fixes

* conditions stuff ([59f18f4](https://github.com/ProjectXero/dbds/commit/59f18f47e9e657a954eaa3475cf25045cee976d5))
* correctly set expected default with one row ([6c3953d](https://github.com/ProjectXero/dbds/commit/6c3953db64cee1258ac23430da777a16d0e3ef3f))
* enable callers to properly disconnect db ([5850fc3](https://github.com/ProjectXero/dbds/commit/5850fc3ce87e347924b25ed8ff8fda56a3e4c28d))
* implicit order dependency with custom types ([6b52230](https://github.com/ProjectXero/dbds/commit/6b52230df78e60188fa29f55a27432231fc281e2))
* inverted hasDefault logic ([444f875](https://github.com/ProjectXero/dbds/commit/444f8750ef46f803ec6018631c732c8d6e5dc637))
* LoaderFactory types ([1019ae4](https://github.com/ProjectXero/dbds/commit/1019ae4eba34dc138f1ddaf8e1a3d251effc2beb))
* make pg-typegen executable ([00182f6](https://github.com/ProjectXero/dbds/commit/00182f6286f0b541026069b432d70cc24100e0b1))
* move columnTypes to constructor arg ([f179d89](https://github.com/ProjectXero/dbds/commit/f179d89081f0a27bd3c5fd99ac77fecb331fa3c8))
* only warn about unknown type once ([0f56466](https://github.com/ProjectXero/dbds/commit/0f56466ba4f168561f0fb4bd0d0765110a57c535))
* orderBy ASC/DESC API ([222833a](https://github.com/ProjectXero/dbds/commit/222833a045cfe91f62ece0bae838f64005ea0c30)), closes [#3](https://github.com/ProjectXero/dbds/issues/3)
* pre-emptively stop removing comments from output ([1495e35](https://github.com/ProjectXero/dbds/commit/1495e359a0b52afbe79463142ee9a93c7d09afd6))
* prefer udt_name over data_type for array elements ([cfb9859](https://github.com/ProjectXero/dbds/commit/cfb9859a39bf739df02dbc82f2cb199e0b72e516))
* register table types ([01cfd17](https://github.com/ProjectXero/dbds/commit/01cfd17428b90117989558a2be63c065d468bece))
* remove unnecessary declare keywords ([d2086ca](https://github.com/ProjectXero/dbds/commit/d2086cae937f204e83f7831edf77f0c517bf3bd9))
* require  or  for delete query ([cc6d75b](https://github.com/ProjectXero/dbds/commit/cc6d75bb3b204d23faa809ccf6251ca1fc37c975))
* update stuff i missed before ([db10afd](https://github.com/ProjectXero/dbds/commit/db10afddcfe34934b7192af70d249412157fd35b))
