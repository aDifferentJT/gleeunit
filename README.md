# gleeunit

A simple test runner for Gleam, using EUnit on Erlang and a custom runner on JS.

[![Package Version](https://img.shields.io/hexpm/v/gleeunit)](https://hex.pm/packages/gleeunit)
[![Hex Docs](https://img.shields.io/badge/hex-docs-ffaff3)](https://hexdocs.pm/gleeunit/)


```sh
gleam add gleeunit@1 --dev
```
```gleam
// In test/yourapp_test.gleam
import gleeunit

pub fn main() {
  gleeunit.main()
}
```

Now any public function with a name ending in `_test` in the `test` directory
will be found and run as a test.

```gleam
pub fn some_function_test() {
  assert some_function() == "Hello!"
}
```

Run the tests by entering `gleam test` in the command line.

### Deno

If using the Deno JavaScript runtime, you will need to add the following to your
`gleam.toml`.

```toml
[javascript.deno]
allow_read = [
  "gleam.toml",
  "test",
  "build",
]
```

### Timeouts

On the JavaScript backend each test has a timeout. A test that does not settle
within the timeout is reported as a failure rather than hanging the whole run.

The default timeout is 5000 milliseconds. Override it with the
`GLEEUNIT_TIMEOUT` environment variable, in milliseconds:

```sh
GLEEUNIT_TIMEOUT=20000 gleam test --target javascript
```

A missing, zero, negative, or non-numeric value falls back to the default.

The timeout only interrupts *asynchronous* work — an unsettled promise, a long
`await`, a pending timer. A *synchronous* infinite loop never yields control
back to the JavaScript runtime, so it cannot be interrupted and the run will
still hang. (On the Erlang backend EUnit applies its own per-test timeout.)
