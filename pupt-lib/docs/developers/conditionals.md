# Conditionals Reference

This page is the complete reference for conditional logic in pupt-lib, covering formula syntax, all supported functions, and evaluation rules.

For user-facing documentation, see [Conditional Logic](/guide/conditional-logic) and [Control Flow](/components/control-flow).

## Formula Syntax

Formulas in `<If when="=...">` use Excel-style expressions that start with `=`. Under the hood, pupt-lib evaluates them with [HyperFormula](https://hyperformula.handsontable.com/) v3, an open-source Excel-compatible formula engine.

```xml
<If when="=count>5">Many items.</If>
<If when="=AND(role='admin', status='active')">Admin content.</If>
<If when="=SUM(score1,score2,score3)>200">High score.</If>
```

### How Evaluation Works

When you write `<If when="=count>5">`, the formula engine goes through four steps to produce a boolean result.

First, each input variable from `context.inputs` gets its own spreadsheet cell in column A. For example, if you have three inputs (`count`, `role`, `status`), they occupy cells `A1`, `A2`, and `A3` respectively.

Next, the engine replaces variable names in the formula with their corresponding cell references using word-boundary matching. So `count>5` becomes something like `A1>5`.

Then HyperFormula evaluates the rewritten formula and returns a raw result.

Finally, the raw result converts to a boolean following these rules:

- Boolean results pass through directly.
- Numbers: `0` maps to `false`; any other number maps to `true`.
- Strings: an empty string maps to `false`; a non-empty string maps to `true`.
- Errors (invalid formula, division by zero, etc.) map to `false`.

### Value Type Mapping

Before evaluation, the engine maps each JavaScript input value to a HyperFormula cell type. The `formatValueForHyperFormula` helper handles this conversion:

| JavaScript Type | Cell Type | Example |
|----------------|-----------|---------|
| `string` | Text cell | `"hello"` |
| `number` | Numeric cell | `42` |
| `boolean` | Boolean cell | `true` / `false` |
| `null` / `undefined` | Empty cell | -- |
| Other | String representation | `String(value)` |

### String Values Without `=`

When the `when` prop is a string that does *not* start with `=`, the engine skips HyperFormula entirely and treats the value as a simple truthy check:

```xml
<If when="hello">This renders.</If>   <!-- non-empty string = true -->
<If when="">This does not render.</If> <!-- empty string = false -->
```

---

## Comparison Operators

You can use standard comparison operators directly inside formulas. Note that string literals in formulas use single quotes, since the `when` prop itself uses double quotes:

```xml
<If when="=count>10">Greater than</If>
<If when="=count<5">Less than</If>
<If when="=count>=10">Greater than or equal</If>
<If when="=count<=5">Less than or equal</If>
<If when="=name='Alice'">Equality (use single quotes for strings)</If>
```

---

## Commonly Used Functions

The tables below highlight the functions you will reach for most often. Each example shows the function inside a `when` formula.

### Logical Functions

| Function | Description | Example |
|----------|-------------|---------|
| `AND(a, b, ...)` | True if all arguments are true | `=AND(age>=18, hasConsent)` |
| `OR(a, b, ...)` | True if any argument is true | `=OR(role='admin', role='owner')` |
| `NOT(a)` | Inverts a boolean | `=NOT(dryRun)` |
| `IF(test, then, else)` | Returns one of two values | `=IF(score>90, TRUE, FALSE)` |
| `IFS(test1, val1, ...)` | First matching condition | `=IFS(x>90, TRUE, x>50, TRUE)` |
| `IFERROR(value, fallback)` | Returns fallback if error | `=IFERROR(a/b, FALSE)` |
| `SWITCH(expr, case1, val1, ...)` | Multi-value matching | `=SWITCH(mode, "fast", TRUE, "slow", FALSE)` |
| `XOR(a, b, ...)` | True if odd number are true | `=XOR(optionA, optionB)` |

### Math Functions

| Function | Description | Example |
|----------|-------------|---------|
| `SUM(a, b, ...)` | Sum of values | `=SUM(score1, score2, score3)>200` |
| `ABS(n)` | Absolute value | `=ABS(delta)<0.01` |
| `MOD(n, divisor)` | Remainder | `=MOD(count, 2)=0` |
| `ROUND(n, places)` | Round to decimal places | `=ROUND(ratio, 2)>0.5` |
| `INT(n)` | Round down to integer | `=INT(total)>100` |
| `MIN(a, b, ...)` | Smallest value | `=MIN(x, y, z)>0` |
| `MAX(a, b, ...)` | Largest value | `=MAX(x, y, z)<100` |
| `AVERAGE(a, b, ...)` | Arithmetic mean | `=AVERAGE(s1, s2, s3)>=80` |

### Text Functions

| Function | Description | Example |
|----------|-------------|---------|
| `LEN(text)` | String length | `=LEN(name)>0` |
| `LEFT(text, n)` | First n characters | `=LEFT(code, 2)="US"` |
| `RIGHT(text, n)` | Last n characters | `=RIGHT(file, 3)="csv"` |
| `MID(text, start, n)` | Substring | `=MID(id, 1, 4)="PROJ"` |
| `UPPER(text)` | Uppercase | `=UPPER(status)="ACTIVE"` |
| `LOWER(text)` | Lowercase | `=LOWER(type)="error"` |
| `TRIM(text)` | Remove extra spaces | `=LEN(TRIM(input))>0` |
| `CONCATENATE(a, b, ...)` | Join strings | `=LEN(CONCATENATE(first, last))>0` |
| `EXACT(a, b)` | Case-sensitive compare | `=EXACT(password, confirm)` |
| `FIND(search, text)` | Find substring position | `=IFERROR(FIND("@", email), 0)>0` |
| `SUBSTITUTE(text, old, new)` | Replace text | — |

### Information Functions

| Function | Description | Example |
|----------|-------------|---------|
| `ISBLANK(value)` | True if empty/null | `=ISBLANK(optionalField)` |
| `ISNUMBER(value)` | True if number | `=ISNUMBER(input)` |
| `ISTEXT(value)` | True if string | `=ISTEXT(value)` |
| `ISLOGICAL(value)` | True if boolean | `=ISLOGICAL(flag)` |
| `ISEVEN(n)` | True if even number | `=ISEVEN(count)` |
| `ISODD(n)` | True if odd number | `=ISODD(count)` |

---

## Complete Function List

HyperFormula v3 ships with 395+ built-in functions across 12 categories. The lists below give you a quick scan of what is available. For detailed documentation on any individual function, see the [HyperFormula function reference](https://hyperformula.handsontable.com/guide/built-in-functions.html).

### Date and Time (26 functions)

`DATE`, `DATEDIF`, `DATEVALUE`, `DAY`, `DAYS`, `DAYS360`, `EDATE`, `EOMONTH`, `HOUR`, `INTERVAL`, `ISOWEEKNUM`, `MINUTE`, `MONTH`, `NETWORKDAYS`, `NETWORKDAYS.INTL`, `NOW`, `SECOND`, `TIME`, `TIMEVALUE`, `TODAY`, `WEEKDAY`, `WEEKNUM`, `WORKDAY`, `WORKDAY.INTL`, `YEAR`, `YEARFRAC`

### Engineering (50+ functions)

`BIN2DEC`, `BIN2HEX`, `BIN2OCT`, `BITAND`, `BITLSHIFT`, `BITOR`, `BITRSHIFT`, `BITXOR`, `COMPLEX`, `DEC2BIN`, `DEC2HEX`, `DEC2OCT`, `DELTA`, `ERF`, `ERFC`, `HEX2BIN`, `HEX2DEC`, `HEX2OCT`, `IMABS`, `IMAGINARY`, `IMARGUMENT`, `IMCONJUGATE`, `IMCOS`, `IMCOSH`, `IMCOT`, `IMCSC`, `IMCSCH`, `IMDIV`, `IMEXP`, `IMLN`, `IMLOG10`, `IMLOG2`, `IMPOWER`, `IMPRODUCT`, `IMREAL`, `IMSEC`, `IMSECH`, `IMSIN`, `IMSINH`, `IMSQRT`, `IMSUB`, `IMSUM`, `IMTAN`, `OCT2BIN`, `OCT2DEC`, `OCT2HEX`

### Financial (27 functions)

`CUMIPMT`, `CUMPRINC`, `DB`, `DDB`, `DOLLARDE`, `DOLLARFR`, `EFFECT`, `FV`, `FVSCHEDULE`, `IPMT`, `ISPMT`, `MIRR`, `NOMINAL`, `NPER`, `NPV`, `PDURATION`, `PMT`, `PPMT`, `PV`, `RATE`, `RRI`, `SLN`, `SYD`, `TBILLEQ`, `TBILLPRICE`, `TBILLYIELD`, `XNPV`

### Information (16 functions)

`ISBINARY`, `ISBLANK`, `ISERR`, `ISERROR`, `ISEVEN`, `ISFORMULA`, `ISLOGICAL`, `ISNA`, `ISNONTEXT`, `ISNUMBER`, `ISODD`, `ISREF`, `ISTEXT`, `NA`, `SHEET`, `SHEETS`

### Logical (11 functions)

`AND`, `FALSE`, `IF`, `IFERROR`, `IFNA`, `IFS`, `NOT`, `OR`, `SWITCH`, `TRUE`, `XOR`

### Lookup and Reference (13 functions)

`ADDRESS`, `CHOOSE`, `COLUMN`, `COLUMNS`, `FORMULATEXT`, `HLOOKUP`, `INDEX`, `MATCH`, `OFFSET`, `ROW`, `ROWS`, `VLOOKUP`, `XLOOKUP`

### Math and Trigonometry (80+ functions)

`ABS`, `ACOS`, `ACOSH`, `ACOT`, `ACOTH`, `ARABIC`, `ASIN`, `ASINH`, `ATAN`, `ATAN2`, `ATANH`, `BASE`, `CEILING`, `CEILING.MATH`, `CEILING.PRECISE`, `COMBIN`, `COMBINA`, `COS`, `COSH`, `COT`, `COTH`, `COUNTUNIQUE`, `CSC`, `CSCH`, `DECIMAL`, `DEGREES`, `EVEN`, `EXP`, `FACT`, `FACTDOUBLE`, `FLOOR`, `FLOOR.MATH`, `FLOOR.PRECISE`, `GCD`, `INT`, `ISO.CEILING`, `LCM`, `LN`, `LOG`, `LOG10`, `MOD`, `MROUND`, `MULTINOMIAL`, `ODD`, `PI`, `POWER`, `PRODUCT`, `QUOTIENT`, `RADIANS`, `RAND`, `RANDBETWEEN`, `ROMAN`, `ROUND`, `ROUNDDOWN`, `ROUNDUP`, `SEC`, `SECH`, `SERIESSUM`, `SIGN`, `SIN`, `SINH`, `SQRT`, `SQRTPI`, `SUBTOTAL`, `SUM`, `SUMIF`, `SUMIFS`, `SUMPRODUCT`, `SUMSQ`, `SUMX2MY2`, `SUMX2PY2`, `SUMXMY2`, `TAN`, `TANH`, `TRUNC`

### Matrix (4 functions)

`MAXPOOL`, `MEDIANPOOL`, `MMULT`, `TRANSPOSE`

### Statistical (90+ functions)

`AVEDEV`, `AVERAGE`, `AVERAGEA`, `AVERAGEIF`, `AVERAGEIFS`, `BESSELI`, `BESSELJ`, `BESSELK`, `BESSELY`, `BETA.DIST`, `BETA.INV`, `BETADIST`, `BETAINV`, `BINOM.DIST`, `BINOM.INV`, `BINOMDIST`, `CHIDIST`, `CHIINV`, `CHISQ.DIST`, `CHISQ.DIST.RT`, `CHISQ.INV`, `CHISQ.INV.RT`, `CHISQ.TEST`, `CONFIDENCE`, `CONFIDENCE.NORM`, `CONFIDENCE.T`, `CORREL`, `COUNT`, `COUNTA`, `COUNTBLANK`, `COUNTIF`, `COUNTIFS`, `COVAR`, `COVARIANCE.P`, `COVARIANCE.S`, `DEVSQ`, `EXPON.DIST`, `EXPONDIST`, `F.DIST`, `F.DIST.RT`, `F.INV`, `F.INV.RT`, `F.TEST`, `FISHER`, `FISHERINV`, `FORECAST`, `GAMMA`, `GAMMA.DIST`, `GAMMA.INV`, `GAMMADIST`, `GAMMAINV`, `GAMMALN`, `GAMMALN.PRECISE`, `GAUSS`, `GEOMEAN`, `HARMEAN`, `HYPGEOM.DIST`, `HYPGEOMDIST`, `INTERCEPT`, `LARGE`, `LOGNORM.DIST`, `LOGNORM.INV`, `LOGNORMDIST`, `LOGNORMINV`, `MAX`, `MAXA`, `MAXIFS`, `MEDIAN`, `MIN`, `MINA`, `MINIFS`, `NEGBINOM.DIST`, `NEGBINOMDIST`, `NORM.DIST`, `NORM.INV`, `NORM.S.DIST`, `NORM.S.INV`, `NORMDIST`, `NORMINV`, `NORMSDIST`, `NORMSINV`, `PEARSON`, `PERCENTILE`, `PERCENTRANK`, `PERMUT`, `PHI`, `POISSON`, `POISSON.DIST`, `PROB`, `RSQ`, `SKEW`, `SKEW.P`, `SLOPE`, `SMALL`, `STANDARDIZE`, `STDEV`, `STDEV.P`, `STDEV.S`, `STDEVA`, `STDEVP`, `STDEVPA`, `STEYX`, `T.DIST`, `T.DIST.2T`, `T.DIST.RT`, `T.INV`, `T.INV.2T`, `T.TEST`, `TDIST`, `TINV`, `TTEST`, `VAR`, `VAR.P`, `VAR.S`, `VARA`, `VARP`, `VARPA`, `WEIBULL`, `WEIBULL.DIST`, `Z.TEST`, `ZTEST`

### Text (23 functions)

`CHAR`, `CLEAN`, `CODE`, `CONCATENATE`, `EXACT`, `FIND`, `LEFT`, `LEN`, `LOWER`, `MID`, `PROPER`, `REPLACE`, `REPT`, `RIGHT`, `SEARCH`, `SPLIT`, `SUBSTITUTE`, `T`, `TEXT`, `TRIM`, `UNICHAR`, `UNICODE`, `UPPER`

### Array Manipulation (3 functions)

`ARRAY_CONSTRAIN`, `ARRAYFORMULA`, `FILTER`

---

## Provider Conditions

Beyond formula-based conditions, the `<If>` component supports provider-based conditions that check `context.env.llm.provider`. You can target a single provider or pass an array:

```xml
<If provider="anthropic">Anthropic-only content.</If>
<If provider={['anthropic', 'google']}>Anthropic or Google.</If>
<If notProvider="openai">All providers except OpenAI.</If>
<If notProvider={['openai', 'google']}>Exclude OpenAI and Google.</If>
```

Supported providers: `anthropic`, `openai`, `google`, `meta`, `mistral`, `deepseek`, `xai`, `cohere`, `unspecified`.

### Evaluation Precedence

The `<If>` component uses an if/else-if chain internally, so only one condition type applies per element. If you specify multiple condition props, the component picks the first match and ignores the rest:

1. `provider` -- the component checks this first. If present, it ignores `notProvider` and `when`.
2. `notProvider` -- checked only when `provider` is absent. If present, it ignores `when`.
3. `when` -- checked only when neither `provider` nor `notProvider` is present.

In practice, you should use only one condition type per `<If>` element to keep behavior obvious.

---

## Delimiter Options

The structural components `When`, `Fallback`, `Fallbacks`, and `EdgeCases` each accept a `delimiter` prop that controls how their output text gets wrapped. All four default to `'xml'`:

| Delimiter | Output |
|-----------|--------|
| `'xml'` (default) | Wrapped in XML tags: `<tag>content</tag>` |
| `'markdown'` | Preceded by a markdown header: `## tag` |
| `'none'` | Plain text with no wrapping |

---

## Related

- [Conditional Logic](/guide/conditional-logic) — user-facing tutorial
- [Control Flow](/components/control-flow) — `If`, `ForEach`, `EdgeCases`, `Fallbacks` reference
- [HyperFormula Documentation](https://hyperformula.handsontable.com/guide/built-in-functions.html) — full function reference
