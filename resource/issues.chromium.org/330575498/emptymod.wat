(module
  (func (export "nopnop") (param i32) (result i32)
    local.get 0
    i32.const 0x13371337
    i32.add
    i32.const 42
    i32.mul
    )
)
