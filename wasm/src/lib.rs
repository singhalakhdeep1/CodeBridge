#[no_mangle]
pub extern "C" fn add(a: i32, b: i32) -> i32 {
    a + b
}

#[no_mangle]
pub extern "C" fn multiply(a: i32, b: i32) -> i32 {
    a * b
}

#[no_mangle]
pub extern "C" fn fibonacci(n: i32) -> i32 {
    if n <= 1 {
        return n;
    }
    fibonacci(n - 1) + fibonacci(n - 2)
}

#[no_mangle]
pub extern "C" fn is_prime(n: i32) -> i32 {
    if n <= 1 {
        return 0;
    }
    if n <= 3 {
        return 1;
    }
    if n % 2 == 0 || n % 3 == 0 {
        return 0;
    }
    let mut i = 5;
    while i * i <= n {
        if n % i == 0 || n % (i + 2) == 0 {
            return 0;
        }
        i += 6;
    }
    1
}

#[no_mangle]
pub extern "C" fn quick_sort(arr_ptr: *mut i32, len: usize) {
    unsafe {
        let arr = std::slice::from_raw_parts_mut(arr_ptr, len);
        if len <= 1 {
            return;
        }
        let pivot = arr[len / 2];
        let mut i = 0;
        let mut j = len - 1;
        
        loop {
            while arr[i] < pivot {
                i += 1;
            }
            while arr[j] > pivot {
                j -= 1;
            }
            if i >= j {
                break;
            }
            arr.swap(i, j);
            i += 1;
            if j > 0 {
                j -= 1;
            }
        }
        
        if i > 0 {
            quick_sort(arr_ptr, i);
        }
        quick_sort(arr_ptr.add(i), len - i);
    }
}
