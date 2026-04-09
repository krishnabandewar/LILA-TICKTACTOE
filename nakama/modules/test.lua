local nk = require("nakama")

local function test_rpc_fn(context, payload)
  return nk.json_encode({ ok = true, msg = "test works!" })
end

nk.register_rpc(test_rpc_fn, "test_rpc")
