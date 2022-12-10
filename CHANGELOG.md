## [3.2.1](https://github.com/ProjectXero/dbds/compare/v3.2.0...v3.2.1) (2022-12-10)


### Bug Fixes

* nullable columns are also optional ([2e78241](https://github.com/ProjectXero/dbds/commit/2e78241404e4f10d09ffb7b219f22eaccd5c8a0a))

## [3.2.0](https://github.com/ProjectXero/dbds/compare/v3.1.0...v3.2.0) (2022-12-10)


### Features

* modify insert types based on updatability ([9b2d4f7](https://github.com/ProjectXero/dbds/commit/9b2d4f74fd203ceba36b2f93cceef81c8f3abb54))


### Bug Fixes

* correctly type expression generated columns ([da792a1](https://github.com/ProjectXero/dbds/commit/da792a17baa3b3b7ca60ed979d04bd4f72589882))
* correctly type generated id columns ([073cfad](https://github.com/ProjectXero/dbds/commit/073cfad8e8f9839f09965365306123ef54769949))

## [3.1.0](https://github.com/ProjectXero/dbds/compare/v3.0.0...v3.1.0) (2022-12-10)


### Features

* disable eslint by default ([a363713](https://github.com/ProjectXero/dbds/commit/a363713680adb1562f7340fa8c24c1a852fccc31))


### Bug Fixes

* zod date function is lowercase ([f60bbbc](https://github.com/ProjectXero/dbds/commit/f60bbbc8e8ccfe0e88f42ca334cde5476737ff42))

## [3.0.0](https://github.com/ProjectXero/dbds/compare/v2.5.0...v3.0.0) (2022-12-10)


### ⚠ BREAKING CHANGES

* overhaul everything to be Zod-based
* update everything for latest slonik
* remove dependency on apollo

### Features

* overhaul everything to be Zod-based ([d3d2166](https://github.com/ProjectXero/dbds/commit/d3d216605885b43776ec04c7b3903d328b0135e3))
* update everything for latest slonik ([cf6417c](https://github.com/ProjectXero/dbds/commit/cf6417c9f7b228d04ddf6ee4b252a56da6c9d008))


### Bug Fixes

* circular, recursive, and out-of-order relationships ([4a42a4b](https://github.com/ProjectXero/dbds/commit/4a42a4b95613f18d77b18585cd4d9b47109e3db6))
* default value expression ([a98e6e8](https://github.com/ProjectXero/dbds/commit/a98e6e82cf84db1b863e83a0316fc32a012f0a81))
* differentiate select and insert types ([6aa881a](https://github.com/ProjectXero/dbds/commit/6aa881a14ff6bb78d47dfc3622f2eddc3bfcc9c9))
* import sources are strings, not identifiers ([aa1817b](https://github.com/ProjectXero/dbds/commit/aa1817b2af9f8de47c1f7e8ebf4093576abafa7e))
* remove dependency on apollo ([98d9ef5](https://github.com/ProjectXero/dbds/commit/98d9ef5cad8ea9364358f4b1ec238ad6bf1b8a8e))

## [2.5.0](https://github.com/ProjectXero/dbds/compare/v2.4.0...v2.5.0) (2022-06-02)


### Features

* allow query options to be overridden at call time ([e827992](https://github.com/ProjectXero/dbds/commit/e827992a75d2525fd567114a9b064f95574e1532))
* allow query options to be overridden at call time ([#446](https://github.com/ProjectXero/dbds/issues/446)) ([be19e5d](https://github.com/ProjectXero/dbds/commit/be19e5d2a3e2d4521ce61bb752558db13e6c1610))

## [2.4.0](https://github.com/ProjectXero/dbds/compare/v2.3.0...v2.4.0) (2022-04-13)


### Features

* add zod-based schema parsing capability ([51a2957](https://github.com/ProjectXero/dbds/commit/51a2957ea1bcb2833f58dcfeb9a0d13fa4b10fd8))
* generate columnTypes as const rather than Record ([8bda964](https://github.com/ProjectXero/dbds/commit/8bda96443fab04bb99f9caca2acad628a918bf37))

## [2.3.0](https://github.com/ProjectXero/dbds/compare/v2.2.0...v2.3.0) (2022-04-05)


### Features

* transaction support ([a00de42](https://github.com/ProjectXero/dbds/commit/a00de4206e4bf333f1410a8e631af9c636cbff3a))

## [2.2.0](https://github.com/ProjectXero/dbds/compare/v2.1.3...v2.2.0) (2022-04-05)


### Features

* auto-prime other loaders ([4cdd9a0](https://github.com/ProjectXero/dbds/commit/4cdd9a016f87409033aa1c01f0d14d4478fbd640))

### [2.1.3](https://github.com/ProjectXero/dbds/compare/v2.1.2...v2.1.3) (2022-04-01)


### Bug Fixes

* make multi-column loaders actually castable ([b9b7006](https://github.com/ProjectXero/dbds/commit/b9b7006e2fee359fb2b1aa8bcfe18f9aecffb36e))
* make multi-column loaders actually castable ([#415](https://github.com/ProjectXero/dbds/issues/415)) ([0889674](https://github.com/ProjectXero/dbds/commit/0889674fdf0abb76ca8f28965d52a5c11d3e43f8))

### [2.1.2](https://github.com/ProjectXero/dbds/compare/v2.1.1...v2.1.2) (2022-03-31)


### Bug Fixes

* respect column casing in multi-column matchers ([#414](https://github.com/ProjectXero/dbds/issues/414)) ([538b793](https://github.com/ProjectXero/dbds/commit/538b79308294df7ca0d99b7edb47be0b687a0c8b))
* respect column casing in multi-loaders ([4072efc](https://github.com/ProjectXero/dbds/commit/4072efc769e4f2206cb886382812be89123fea87))

### [2.1.1](https://github.com/ProjectXero/dbds/compare/v2.1.0...v2.1.1) (2022-03-30)


### Bug Fixes

* add missing overloads ([0d299b5](https://github.com/ProjectXero/dbds/commit/0d299b5ef9eb7b6b9ab8094d36dce2f972b71174))
* add missing overloads ([#413](https://github.com/ProjectXero/dbds/issues/413)) ([1d62716](https://github.com/ProjectXero/dbds/commit/1d627169989d720fa488f9437993661a1755920d))

## [2.1.0](https://github.com/ProjectXero/dbds/compare/v2.0.0...v2.1.0) (2022-03-30)


### Features

* implement multi-loader data function ([d34b561](https://github.com/ProjectXero/dbds/commit/d34b561f3c135c5388f9600f4f49d76222ebce72))
* initial implementation of createMulti loader ([7d286ce](https://github.com/ProjectXero/dbds/commit/7d286ced6e6cd8a8711957b1e9b68c28f6c89399))
* multi-column loaders ([#410](https://github.com/ProjectXero/dbds/issues/410)) ([c55f2a5](https://github.com/ProjectXero/dbds/commit/c55f2a5ea31bb763998ca348b041252ed009eab5))

## [2.0.0](https://github.com/ProjectXero/dbds/compare/v1.9.4...v2.0.0) (2022-01-28)


### ⚠ BREAKING CHANGES

* **datasources:** improve api (#389)
* **datasources:** make normalizers editable on a DS-by-DS basis
* **datasources:** make public methods protected
* **datasources:** remove deprecated methods

### Bug Fixes

* **datasources:** improve api ([#389](https://github.com/ProjectXero/dbds/issues/389)) ([be80d23](https://github.com/ProjectXero/dbds/commit/be80d235c7caaadd70a94f3539dd7d21e13715b8))
* **datasources:** make normalizers editable on a DS-by-DS basis ([63ee861](https://github.com/ProjectXero/dbds/commit/63ee861601ba7e8bc3d135c730a6bd62632285fe))
* **datasources:** make public methods protected ([820b295](https://github.com/ProjectXero/dbds/commit/820b2956088469fcd455632562a85d8795a7e666))
* **datasources:** remove deprecated methods ([df45398](https://github.com/ProjectXero/dbds/commit/df45398be5954cbceef74694aa85c502e997e130))

### [1.9.4](https://github.com/ProjectXero/dbds/compare/v1.9.3...v1.9.4) (2022-01-24)


### ⚠ BREAKING CHANGES

* **deps:** upgrade yargs
* **deps:** upgrade slonik dependencies
* **deps:** upgrade apollo dependencies

### Bug Fixes

* type changes ([3e78745](https://github.com/ProjectXero/dbds/commit/3e78745368328e0f9cf8f539254a169fdffac282))


### Miscellaneous Chores

* **deps:** upgrade apollo dependencies ([80151dd](https://github.com/ProjectXero/dbds/commit/80151dd4c9496f2af51ee35b448c71e185ce8671))
* **deps:** upgrade slonik dependencies ([d6e8464](https://github.com/ProjectXero/dbds/commit/d6e8464c1943590247cf7f95bdbe4873aa7992ee))
* **deps:** upgrade yargs ([381ef0c](https://github.com/ProjectXero/dbds/commit/381ef0c8183dccbb100f0ead48d669e5c2ce696c))

### [1.9.3](https://github.com/ProjectXero/dbds/compare/v1.9.2...v1.9.3) (2021-09-14)


### Bug Fixes

* **generator:** use case-sensitive collations ([741cfab](https://github.com/ProjectXero/dbds/commit/741cfabdfe3d4a8e02a3cc8a6927416313b2d2e5))
* **generator:** use case-sensitive collations ([#333](https://github.com/ProjectXero/dbds/issues/333)) ([be6a05d](https://github.com/ProjectXero/dbds/commit/be6a05dbdda08a1e74d914c35fc5d1952c97a246))

### [1.9.2](https://github.com/ProjectXero/dbds/compare/v1.9.1...v1.9.2) (2021-09-13)


### Bug Fixes

* **generator:** use case-insensitive collations ([824dc27](https://github.com/ProjectXero/dbds/commit/824dc27558ebf19deff607f833050faee89bed96))

### [1.9.1](https://github.com/ProjectXero/dbds/compare/v1.9.0...v1.9.1) (2021-07-21)


### Bug Fixes

* **insert:** return array when given an array of one input ([a9a4a8c](https://github.com/ProjectXero/dbds/commit/a9a4a8cefee25e5eef904d3b1c58047b0cb0d288))
* **insert:** return array when given an array of one input ([#285](https://github.com/ProjectXero/dbds/issues/285)) ([c4ef47b](https://github.com/ProjectXero/dbds/commit/c4ef47bfaaab261b0c6978bb70ba9803b427807a))

## [1.9.0](https://github.com/ProjectXero/dbds/compare/v1.8.1...v1.9.0) (2021-07-21)


### Features

* finders overhaul ([#283](https://github.com/ProjectXero/dbds/issues/283)) ([3a3b446](https://github.com/ProjectXero/dbds/commit/3a3b446c4bc0e6fe283b7a4cf98c64bcbc4e5e8a))
* **datasource:** create new FinderFactory interface ([d78a139](https://github.com/ProjectXero/dbds/commit/d78a1398f613c09a9e4d13a0d796691222ca4ce2))
* **datasource:** extend loader to infer multi for finders ([02b5be8](https://github.com/ProjectXero/dbds/commit/02b5be82d57565c0d0d8f4a6fade918574c5f2ae))

### [1.8.1](https://github.com/ProjectXero/dbds/compare/v1.8.0...v1.8.1) (2021-07-02)

## [1.8.0](https://github.com/ProjectXero/dbds/compare/v1.7.1...v1.8.0) (2021-05-06)


### Features

* add method for counting by groups of columns ([c6afe19](https://github.com/ProjectXero/dbds/commit/c6afe19e25a15d0bf73f853fa404b8a0809898fd))


### Bug Fixes

* fix incorrect types for count method ([0d4796d](https://github.com/ProjectXero/dbds/commit/0d4796ddd8f1c407ecced6f7d41ef8bb0a4b5788))

### [1.7.1](https://github.com/ProjectXero/dbds/compare/v1.7.0...v1.7.1) (2021-04-19)


### Bug Fixes

* **date:** dates should be dates ([4875da2](https://github.com/ProjectXero/dbds/commit/4875da290174235376357fea5c4865449f0a7331))
* **date:** dates should be dates ([#201](https://github.com/ProjectXero/dbds/issues/201)) ([769dc8b](https://github.com/ProjectXero/dbds/commit/769dc8bf449bb700e558b48498ffa6f0233bfc28))

## [1.7.0](https://github.com/ProjectXero/dbds/compare/v1.6.0...v1.7.0) (2021-04-16)


### Features

* allow getData to be overridden in loader creation ([ebb2a1e](https://github.com/ProjectXero/dbds/commit/ebb2a1eb9337b3478e7e8edbf35755f33318c724))
* allow getData to be overridden in loader creation ([#200](https://github.com/ProjectXero/dbds/issues/200)) ([abbde04](https://github.com/ProjectXero/dbds/commit/abbde041454fa6ce3429c936c9ebf02903d6b831))

## [1.6.0](https://github.com/ProjectXero/dbds/compare/v1.5.3...v1.6.0) (2021-03-31)


### Features

* enable custom operators through use of sql tokens ([0254308](https://github.com/ProjectXero/dbds/commit/0254308a38019974c91fccff3e128c1e9ff86113))
* enable custom operators through use of sql tokens ([#192](https://github.com/ProjectXero/dbds/issues/192)) ([c4a77db](https://github.com/ProjectXero/dbds/commit/c4a77dbb9d786ed5eab38d8ecac3f7afeb58299d))

### [1.5.3](https://github.com/ProjectXero/dbds/compare/v1.5.2...v1.5.3) (2021-03-17)


### Bug Fixes

* order columns alphabetically ([6ce8880](https://github.com/ProjectXero/dbds/commit/6ce888067dc4a554ad364dc6aafd292fd175773b)), closes [#168](https://github.com/ProjectXero/dbds/issues/168)

### [1.5.2](https://github.com/ProjectXero/dbds/compare/v1.5.1...v1.5.2) (2021-03-16)


### Bug Fixes

* null value lookups ([295ceb0](https://github.com/ProjectXero/dbds/commit/295ceb0cb7dfa2e9c7564104426cefd7751e6fe4)), closes [#156](https://github.com/ProjectXero/dbds/issues/156)

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
