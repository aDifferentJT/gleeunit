//// JavaScript-only tests for the test-timeout helpers in `gleeunit_ffi.mjs`.
//// These are excluded from the Erlang build via `@target(javascript)`.

@target(javascript)
@external(javascript, "./js_timeout_test_ffi.mjs", "assertParseTimeout")
fn assert_parse_timeout() -> Nil

@target(javascript)
@external(javascript, "./js_timeout_test_ffi.mjs", "assertFastTestPasses")
fn assert_fast_test_passes() -> Nil

@target(javascript)
@external(javascript, "./js_timeout_test_ffi.mjs", "assertSlowTestTimesOut")
fn assert_slow_test_times_out() -> Nil

@target(javascript)
pub fn parse_timeout_test() -> Nil {
  assert_parse_timeout()
}

@target(javascript)
pub fn run_with_timeout_passes_fast_test() -> Nil {
  assert_fast_test_passes()
}

@target(javascript)
pub fn run_with_timeout_times_out_test() -> Nil {
  assert_slow_test_times_out()
}
