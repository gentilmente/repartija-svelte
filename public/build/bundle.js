
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    const identity = x => x;
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    function run_tasks(now) {
        tasks.forEach(task => {
            if (!task.c(now)) {
                tasks.delete(task);
                task.f();
            }
        });
        if (tasks.size !== 0)
            raf(run_tasks);
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */
    function loop(callback) {
        let task;
        if (tasks.size === 0)
            raf(run_tasks);
        return {
            promise: new Promise(fulfill => {
                tasks.add(task = { c: callback, f: fulfill });
            }),
            abort() {
                tasks.delete(task);
            }
        };
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function to_number(value) {
        return value === '' ? undefined : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        if (value != null || input.value) {
            input.value = value;
        }
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let stylesheet;
    let active = 0;
    let current_rules = {};
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
    }
    function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
        const step = 16.666 / duration;
        let keyframes = '{\n';
        for (let p = 0; p <= 1; p += step) {
            const t = a + (b - a) * ease(p);
            keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
        }
        const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
        const name = `__svelte_${hash(rule)}_${uid}`;
        if (!current_rules[name]) {
            if (!stylesheet) {
                const style = element('style');
                document.head.appendChild(style);
                stylesheet = style.sheet;
            }
            current_rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ``}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        node.style.animation = (node.style.animation || '')
            .split(', ')
            .filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        )
            .join(', ');
        if (name && !--active)
            clear_rules();
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            let i = stylesheet.cssRules.length;
            while (i--)
                stylesheet.deleteRule(i);
            current_rules = {};
        });
    }

    function create_animation(node, from, fn, params) {
        if (!from)
            return noop;
        const to = node.getBoundingClientRect();
        if (from.left === to.left && from.right === to.right && from.top === to.top && from.bottom === to.bottom)
            return noop;
        const { delay = 0, duration = 300, easing = identity, 
        // @ts-ignore todo: should this be separated from destructuring? Or start/end added to public api and documentation?
        start: start_time = now() + delay, 
        // @ts-ignore todo:
        end = start_time + duration, tick = noop, css } = fn(node, { from, to }, params);
        let running = true;
        let started = false;
        let name;
        function start() {
            if (css) {
                name = create_rule(node, 0, 1, duration, delay, easing, css);
            }
            if (!delay) {
                started = true;
            }
        }
        function stop() {
            if (css)
                delete_rule(node, name);
            running = false;
        }
        loop(now => {
            if (!started && now >= start_time) {
                started = true;
            }
            if (started && now >= end) {
                tick(1, 0);
                stop();
            }
            if (!running) {
                return false;
            }
            if (started) {
                const p = now - start_time;
                const t = 0 + 1 * easing(p / duration);
                tick(t, 1 - t);
            }
            return true;
        });
        start();
        tick(0, 1);
        return stop;
    }
    function fix_position(node) {
        const style = getComputedStyle(node);
        if (style.position !== 'absolute' && style.position !== 'fixed') {
            const { width, height } = style;
            const a = node.getBoundingClientRect();
            node.style.position = 'absolute';
            node.style.width = width;
            node.style.height = height;
            add_transform(node, a);
        }
    }
    function add_transform(node, a) {
        const b = node.getBoundingClientRect();
        if (a.left !== b.left || a.top !== b.top) {
            const style = getComputedStyle(node);
            const transform = style.transform === 'none' ? '' : style.transform;
            node.style.transform = `${transform} translate(${a.left - b.left}px, ${a.top - b.top}px)`;
        }
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            callbacks.slice().forEach(fn => fn(event));
        }
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }

    let promise;
    function wait() {
        if (!promise) {
            promise = Promise.resolve();
            promise.then(() => {
                promise = null;
            });
        }
        return promise;
    }
    function dispatch(node, direction, kind) {
        node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    const null_transition = { duration: 0 };
    function create_in_transition(node, fn, params) {
        let config = fn(node, params);
        let running = false;
        let animation_name;
        let task;
        let uid = 0;
        function cleanup() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function go() {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            if (css)
                animation_name = create_rule(node, 0, 1, duration, delay, easing, css, uid++);
            tick(0, 1);
            const start_time = now() + delay;
            const end_time = start_time + duration;
            if (task)
                task.abort();
            running = true;
            add_render_callback(() => dispatch(node, true, 'start'));
            task = loop(now => {
                if (running) {
                    if (now >= end_time) {
                        tick(1, 0);
                        dispatch(node, true, 'end');
                        cleanup();
                        return running = false;
                    }
                    if (now >= start_time) {
                        const t = easing((now - start_time) / duration);
                        tick(t, 1 - t);
                    }
                }
                return running;
            });
        }
        let started = false;
        return {
            start() {
                if (started)
                    return;
                delete_rule(node);
                if (is_function(config)) {
                    config = config();
                    wait().then(go);
                }
                else {
                    go();
                }
            },
            invalidate() {
                started = false;
            },
            end() {
                if (running) {
                    cleanup();
                    running = false;
                }
            }
        };
    }
    function create_out_transition(node, fn, params) {
        let config = fn(node, params);
        let running = true;
        let animation_name;
        const group = outros;
        group.r += 1;
        function go() {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            if (css)
                animation_name = create_rule(node, 1, 0, duration, delay, easing, css);
            const start_time = now() + delay;
            const end_time = start_time + duration;
            add_render_callback(() => dispatch(node, false, 'start'));
            loop(now => {
                if (running) {
                    if (now >= end_time) {
                        tick(0, 1);
                        dispatch(node, false, 'end');
                        if (!--group.r) {
                            // this will result in `end()` being called,
                            // so we don't need to clean up here
                            run_all(group.c);
                        }
                        return false;
                    }
                    if (now >= start_time) {
                        const t = easing((now - start_time) / duration);
                        tick(1 - t, t);
                    }
                }
                return running;
            });
        }
        if (is_function(config)) {
            wait().then(() => {
                // @ts-ignore
                config = config();
                go();
            });
        }
        else {
            go();
        }
        return {
            end(reset) {
                if (reset && config.tick) {
                    config.tick(1, 0);
                }
                if (running) {
                    if (animation_name)
                        delete_rule(node, animation_name);
                    running = false;
                }
            }
        };
    }

    const globals = (typeof window !== 'undefined' ? window : global);
    function outro_and_destroy_block(block, lookup) {
        transition_out(block, 1, 1, () => {
            lookup.delete(block.key);
        });
    }
    function fix_and_outro_and_destroy_block(block, lookup) {
        block.f();
        outro_and_destroy_block(block, lookup);
    }
    function update_keyed_each(old_blocks, dirty, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
        let o = old_blocks.length;
        let n = list.length;
        let i = o;
        const old_indexes = {};
        while (i--)
            old_indexes[old_blocks[i].key] = i;
        const new_blocks = [];
        const new_lookup = new Map();
        const deltas = new Map();
        i = n;
        while (i--) {
            const child_ctx = get_context(ctx, list, i);
            const key = get_key(child_ctx);
            let block = lookup.get(key);
            if (!block) {
                block = create_each_block(key, child_ctx);
                block.c();
            }
            else if (dynamic) {
                block.p(child_ctx, dirty);
            }
            new_lookup.set(key, new_blocks[i] = block);
            if (key in old_indexes)
                deltas.set(key, Math.abs(i - old_indexes[key]));
        }
        const will_move = new Set();
        const did_move = new Set();
        function insert(block) {
            transition_in(block, 1);
            block.m(node, next);
            lookup.set(block.key, block);
            next = block.first;
            n--;
        }
        while (o && n) {
            const new_block = new_blocks[n - 1];
            const old_block = old_blocks[o - 1];
            const new_key = new_block.key;
            const old_key = old_block.key;
            if (new_block === old_block) {
                // do nothing
                next = new_block.first;
                o--;
                n--;
            }
            else if (!new_lookup.has(old_key)) {
                // remove old block
                destroy(old_block, lookup);
                o--;
            }
            else if (!lookup.has(new_key) || will_move.has(new_key)) {
                insert(new_block);
            }
            else if (did_move.has(old_key)) {
                o--;
            }
            else if (deltas.get(new_key) > deltas.get(old_key)) {
                did_move.add(new_key);
                insert(new_block);
            }
            else {
                will_move.add(old_key);
                o--;
            }
        }
        while (o--) {
            const old_block = old_blocks[o];
            if (!new_lookup.has(old_block.key))
                destroy(old_block, lookup);
        }
        while (n)
            insert(new_blocks[n - 1]);
        return new_blocks;
    }
    function validate_each_keys(ctx, list, get_context, get_key) {
        const keys = new Set();
        for (let i = 0; i < list.length; i++) {
            const key = get_key(get_context(ctx, list, i));
            if (keys.has(key)) {
                throw new Error(`Cannot have duplicate keys in a keyed each`);
            }
            keys.add(key);
        }
    }

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }
    function get_spread_object(spread_props) {
        return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.19.2' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/Start.svelte generated by Svelte v3.19.2 */

    const file = "src/Start.svelte";

    function create_fragment(ctx) {
    	let main;
    	let p;
    	let t1;
    	let button;
    	let span;
    	let dispose;

    	const block = {
    		c: function create() {
    			main = element("main");
    			p = element("p");
    			p.textContent = "Comenzá y pasale el 📲 al de tu izq y que se agregue,\n    así hasta que vuelva a vos,\n    colocas tus datos y deslizás \"soy el último\",\n    luego al agregarte verás la magia 👻";
    			t1 = space();
    			button = element("button");
    			span = element("span");
    			span.textContent = "comenzar";
    			add_location(p, file, 1, 2, 9);
    			attr_dev(span, "class", "svelte-hiti45");
    			add_location(span, file, 6, 19, 214);
    			attr_dev(button, "class", "svelte-hiti45");
    			add_location(button, file, 6, 2, 197);
    			attr_dev(main, "class", "svelte-hiti45");
    			add_location(main, file, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, p);
    			append_dev(main, t1);
    			append_dev(main, button);
    			append_dev(button, span);
    			dispose = listen_dev(button, "click", /*click_handler*/ ctx[0], false, false, false);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Start> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Start", $$slots, []);

    	function click_handler(event) {
    		bubble($$self, event);
    	}

    	return [click_handler];
    }

    class Start extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Start",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    function cubicOut(t) {
        const f = t - 1.0;
        return f * f * f + 1.0;
    }
    function quintOut(t) {
        return --t * t * t * t * t + 1;
    }

    /*! *****************************************************************************
    Copyright (c) Microsoft Corporation. All rights reserved.
    Licensed under the Apache License, Version 2.0 (the "License"); you may not use
    this file except in compliance with the License. You may obtain a copy of the
    License at http://www.apache.org/licenses/LICENSE-2.0

    THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
    KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
    WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
    MERCHANTABLITY OR NON-INFRINGEMENT.

    See the Apache Version 2.0 License for specific language governing permissions
    and limitations under the License.
    ***************************************************************************** */

    function __rest(s, e) {
        var t = {};
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
            t[p] = s[p];
        if (s != null && typeof Object.getOwnPropertySymbols === "function")
            for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
                if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                    t[p[i]] = s[p[i]];
            }
        return t;
    }
    function crossfade(_a) {
        var { fallback } = _a, defaults = __rest(_a, ["fallback"]);
        const to_receive = new Map();
        const to_send = new Map();
        function crossfade(from, node, params) {
            const { delay = 0, duration = d => Math.sqrt(d) * 30, easing = cubicOut } = assign(assign({}, defaults), params);
            const to = node.getBoundingClientRect();
            const dx = from.left - to.left;
            const dy = from.top - to.top;
            const dw = from.width / to.width;
            const dh = from.height / to.height;
            const d = Math.sqrt(dx * dx + dy * dy);
            const style = getComputedStyle(node);
            const transform = style.transform === 'none' ? '' : style.transform;
            const opacity = +style.opacity;
            return {
                delay,
                duration: is_function(duration) ? duration(d) : duration,
                easing,
                css: (t, u) => `
				opacity: ${t * opacity};
				transform-origin: top left;
				transform: ${transform} translate(${u * dx}px,${u * dy}px) scale(${t + (1 - t) * dw}, ${t + (1 - t) * dh});
			`
            };
        }
        function transition(items, counterparts, intro) {
            return (node, params) => {
                items.set(params.key, {
                    rect: node.getBoundingClientRect()
                });
                return () => {
                    if (counterparts.has(params.key)) {
                        const { rect } = counterparts.get(params.key);
                        counterparts.delete(params.key);
                        return crossfade(rect, node, params);
                    }
                    // if the node is disappearing altogether
                    // (i.e. wasn't claimed by the other list)
                    // then we need to supply an outro
                    items.delete(params.key);
                    return fallback && fallback(node, params, intro);
                };
            };
        }
        return [
            transition(to_send, to_receive, false),
            transition(to_receive, to_send, true)
        ];
    }

    function flip(node, animation, params) {
        const style = getComputedStyle(node);
        const transform = style.transform === 'none' ? '' : style.transform;
        const scaleX = animation.from.width / node.clientWidth;
        const scaleY = animation.from.height / node.clientHeight;
        const dx = (animation.from.left - animation.to.left) / scaleX;
        const dy = (animation.from.top - animation.to.top) / scaleY;
        const d = Math.sqrt(dx * dx + dy * dy);
        const { delay = 0, duration = (d) => Math.sqrt(d) * 120, easing = cubicOut } = params;
        return {
            delay,
            duration: is_function(duration) ? duration(d) : duration,
            easing,
            css: (_t, u) => `transform: ${transform} translate(${u * dx}px, ${u * dy}px);`
        };
    }

    /* src/Results.svelte generated by Svelte v3.19.2 */

    const file$1 = "src/Results.svelte";

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[6] = list[i];
    	return child_ctx;
    }

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[3] = list[i];
    	return child_ctx;
    }

    // (33:4) {#each item.debtors as d}
    function create_each_block_1(ctx) {
    	let div;
    	let t_value = /*d*/ ctx[6].name + ": " + /*d*/ ctx[6].pay + "";
    	let t;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t = text(t_value);
    			attr_dev(div, "class", "debtors svelte-9f1d9");
    			add_location(div, file$1, 33, 6, 582);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*result*/ 4 && t_value !== (t_value = /*d*/ ctx[6].name + ": " + /*d*/ ctx[6].pay + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(33:4) {#each item.debtors as d}",
    		ctx
    	});

    	return block;
    }

    // (27:2) {#each result as item}
    function create_each_block(ctx) {
    	let div;
    	let t0;
    	let b;
    	let t1_value = /*item*/ ctx[3].name + "";
    	let t1;
    	let t2;
    	let t3;
    	let each_1_anchor;
    	let each_value_1 = /*item*/ ctx[3].debtors;
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = text("A\n      ");
    			b = element("b");
    			t1 = text(t1_value);
    			t2 = text("\n      le deben pagar");
    			t3 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    			add_location(b, file$1, 29, 6, 495);
    			add_location(div, file$1, 27, 4, 475);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t0);
    			append_dev(div, b);
    			append_dev(b, t1);
    			append_dev(div, t2);
    			insert_dev(target, t3, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*result*/ 4 && t1_value !== (t1_value = /*item*/ ctx[3].name + "")) set_data_dev(t1, t1_value);

    			if (dirty & /*result*/ 4) {
    				each_value_1 = /*item*/ ctx[3].debtors;
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (detaching) detach_dev(t3);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(27:2) {#each result as item}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let p0;
    	let t0;
    	let t1;
    	let t2;
    	let p1;
    	let t3;
    	let t4;
    	let t5;
    	let h1;
    	let t7;
    	let div;
    	let t8;
    	let br0;
    	let t9;
    	let br1;
    	let each_value = /*result*/ ctx[2];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			p0 = element("p");
    			t0 = text("total: ");
    			t1 = text(/*total*/ ctx[0]);
    			t2 = space();
    			p1 = element("p");
    			t3 = text("pago individual: ");
    			t4 = text(/*individualPayment*/ ctx[1]);
    			t5 = space();
    			h1 = element("h1");
    			h1.textContent = "Resultado:";
    			t7 = space();
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t8 = space();
    			br0 = element("br");
    			t9 = space();
    			br1 = element("br");
    			attr_dev(p0, "class", "left");
    			add_location(p0, file$1, 21, 0, 314);
    			attr_dev(p1, "class", "right");
    			add_location(p1, file$1, 22, 0, 349);
    			add_location(h1, file$1, 23, 0, 407);
    			attr_dev(div, "class", "box svelte-9f1d9");
    			add_location(div, file$1, 24, 0, 427);
    			add_location(br0, file$1, 38, 0, 663);
    			add_location(br1, file$1, 39, 0, 670);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p0, anchor);
    			append_dev(p0, t0);
    			append_dev(p0, t1);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, p1, anchor);
    			append_dev(p1, t3);
    			append_dev(p1, t4);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, h1, anchor);
    			insert_dev(target, t7, anchor);
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			insert_dev(target, t8, anchor);
    			insert_dev(target, br0, anchor);
    			insert_dev(target, t9, anchor);
    			insert_dev(target, br1, anchor);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*total*/ 1) set_data_dev(t1, /*total*/ ctx[0]);
    			if (dirty & /*individualPayment*/ 2) set_data_dev(t4, /*individualPayment*/ ctx[1]);

    			if (dirty & /*result*/ 4) {
    				each_value = /*result*/ ctx[2];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p0);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(p1);
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(h1);
    			if (detaching) detach_dev(t7);
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(t8);
    			if (detaching) detach_dev(br0);
    			if (detaching) detach_dev(t9);
    			if (detaching) detach_dev(br1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { total } = $$props;
    	let { individualPayment } = $$props;
    	let { result } = $$props;
    	const writable_props = ["total", "individualPayment", "result"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Results> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Results", $$slots, []);

    	$$self.$set = $$props => {
    		if ("total" in $$props) $$invalidate(0, total = $$props.total);
    		if ("individualPayment" in $$props) $$invalidate(1, individualPayment = $$props.individualPayment);
    		if ("result" in $$props) $$invalidate(2, result = $$props.result);
    	};

    	$$self.$capture_state = () => ({ total, individualPayment, result });

    	$$self.$inject_state = $$props => {
    		if ("total" in $$props) $$invalidate(0, total = $$props.total);
    		if ("individualPayment" in $$props) $$invalidate(1, individualPayment = $$props.individualPayment);
    		if ("result" in $$props) $$invalidate(2, result = $$props.result);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [total, individualPayment, result];
    }

    class Results extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {
    			total: 0,
    			individualPayment: 1,
    			result: 2
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Results",
    			options,
    			id: create_fragment$1.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*total*/ ctx[0] === undefined && !("total" in props)) {
    			console.warn("<Results> was created without expected prop 'total'");
    		}

    		if (/*individualPayment*/ ctx[1] === undefined && !("individualPayment" in props)) {
    			console.warn("<Results> was created without expected prop 'individualPayment'");
    		}

    		if (/*result*/ ctx[2] === undefined && !("result" in props)) {
    			console.warn("<Results> was created without expected prop 'result'");
    		}
    	}

    	get total() {
    		throw new Error("<Results>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set total(value) {
    		throw new Error("<Results>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get individualPayment() {
    		throw new Error("<Results>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set individualPayment(value) {
    		throw new Error("<Results>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get result() {
    		throw new Error("<Results>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set result(value) {
    		throw new Error("<Results>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Form.svelte generated by Svelte v3.19.2 */

    const { console: console_1 } = globals;
    const file$2 = "src/Form.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[24] = list[i];
    	child_ctx[25] = list;
    	child_ctx[26] = i;
    	return child_ctx;
    }

    function get_each_context_1$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[24] = list[i];
    	child_ctx[27] = list;
    	child_ctx[28] = i;
    	return child_ctx;
    }

    // (261:4) {#each payments.filter(t => !t.done) as payment (payment.id)}
    function create_each_block_1$1(key_1, ctx) {
    	let label;
    	let input;
    	let t0;
    	let t1_value = /*payment*/ ctx[24].name + ": " + /*payment*/ ctx[24].pay + "";
    	let t1;
    	let t2;
    	let button;
    	let t4;
    	let label_intro;
    	let label_outro;
    	let rect;
    	let stop_animation = noop;
    	let current;
    	let dispose;

    	function input_change_handler() {
    		/*input_change_handler*/ ctx[20].call(input, /*payment*/ ctx[24]);
    	}

    	function click_handler(...args) {
    		return /*click_handler*/ ctx[21](/*payment*/ ctx[24], ...args);
    	}

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			label = element("label");
    			input = element("input");
    			t0 = space();
    			t1 = text(t1_value);
    			t2 = space();
    			button = element("button");
    			button.textContent = "X";
    			t4 = space();
    			attr_dev(input, "type", "checkbox");
    			attr_dev(input, "class", "svelte-1iv5a0i");
    			add_location(input, file$2, 265, 8, 5380);
    			attr_dev(button, "class", "badge svelte-1iv5a0i");
    			add_location(button, file$2, 267, 8, 5486);
    			attr_dev(label, "class", "svelte-1iv5a0i");
    			add_location(label, file$2, 261, 6, 5263);
    			this.first = label;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, label, anchor);
    			append_dev(label, input);
    			input.checked = /*payment*/ ctx[24].done;
    			append_dev(label, t0);
    			append_dev(label, t1);
    			append_dev(label, t2);
    			append_dev(label, button);
    			append_dev(label, t4);
    			current = true;

    			dispose = [
    				listen_dev(input, "change", input_change_handler),
    				listen_dev(button, "click", click_handler, false, false, false)
    			];
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty & /*payments*/ 1) {
    				input.checked = /*payment*/ ctx[24].done;
    			}

    			if ((!current || dirty & /*payments*/ 1) && t1_value !== (t1_value = /*payment*/ ctx[24].name + ": " + /*payment*/ ctx[24].pay + "")) set_data_dev(t1, t1_value);
    		},
    		r: function measure() {
    			rect = label.getBoundingClientRect();
    		},
    		f: function fix() {
    			fix_position(label);
    			stop_animation();
    			add_transform(label, rect);
    		},
    		a: function animate() {
    			stop_animation();
    			stop_animation = create_animation(label, rect, flip, {});
    		},
    		i: function intro(local) {
    			if (current) return;

    			add_render_callback(() => {
    				if (label_outro) label_outro.end(1);
    				if (!label_intro) label_intro = create_in_transition(label, /*receive*/ ctx[5], { key: /*payment*/ ctx[24].id });
    				label_intro.start();
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			if (label_intro) label_intro.invalidate();
    			label_outro = create_out_transition(label, /*send*/ ctx[4], { key: /*payment*/ ctx[24].id });
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(label);
    			if (detaching && label_outro) label_outro.end();
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1$1.name,
    		type: "each",
    		source: "(261:4) {#each payments.filter(t => !t.done) as payment (payment.id)}",
    		ctx
    	});

    	return block;
    }

    // (275:4) {#each payments.filter(t => t.done) as payment (payment.id)}
    function create_each_block$1(key_1, ctx) {
    	let label;
    	let input;
    	let t0;
    	let t1_value = /*payment*/ ctx[24].name + ": " + /*payment*/ ctx[24].pay + "";
    	let t1;
    	let t2;
    	let button;
    	let t4;
    	let label_intro;
    	let label_outro;
    	let rect;
    	let stop_animation = noop;
    	let current;
    	let dispose;

    	function input_change_handler_1() {
    		/*input_change_handler_1*/ ctx[22].call(input, /*payment*/ ctx[24]);
    	}

    	function click_handler_1(...args) {
    		return /*click_handler_1*/ ctx[23](/*payment*/ ctx[24], ...args);
    	}

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			label = element("label");
    			input = element("input");
    			t0 = space();
    			t1 = text(t1_value);
    			t2 = space();
    			button = element("button");
    			button.textContent = "X";
    			t4 = space();
    			attr_dev(input, "type", "checkbox");
    			attr_dev(input, "class", "svelte-1iv5a0i");
    			add_location(input, file$2, 279, 8, 5818);
    			attr_dev(button, "class", "badge svelte-1iv5a0i");
    			add_location(button, file$2, 281, 8, 5924);
    			attr_dev(label, "class", "svelte-1iv5a0i");
    			add_location(label, file$2, 275, 6, 5701);
    			this.first = label;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, label, anchor);
    			append_dev(label, input);
    			input.checked = /*payment*/ ctx[24].done;
    			append_dev(label, t0);
    			append_dev(label, t1);
    			append_dev(label, t2);
    			append_dev(label, button);
    			append_dev(label, t4);
    			current = true;

    			dispose = [
    				listen_dev(input, "change", input_change_handler_1),
    				listen_dev(button, "click", click_handler_1, false, false, false)
    			];
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty & /*payments*/ 1) {
    				input.checked = /*payment*/ ctx[24].done;
    			}

    			if ((!current || dirty & /*payments*/ 1) && t1_value !== (t1_value = /*payment*/ ctx[24].name + ": " + /*payment*/ ctx[24].pay + "")) set_data_dev(t1, t1_value);
    		},
    		r: function measure() {
    			rect = label.getBoundingClientRect();
    		},
    		f: function fix() {
    			fix_position(label);
    			stop_animation();
    			add_transform(label, rect);
    		},
    		a: function animate() {
    			stop_animation();
    			stop_animation = create_animation(label, rect, flip, {});
    		},
    		i: function intro(local) {
    			if (current) return;

    			add_render_callback(() => {
    				if (label_outro) label_outro.end(1);
    				if (!label_intro) label_intro = create_in_transition(label, /*receive*/ ctx[5], { key: /*payment*/ ctx[24].id });
    				label_intro.start();
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			if (label_intro) label_intro.invalidate();
    			label_outro = create_out_transition(label, /*send*/ ctx[4], { key: /*payment*/ ctx[24].id });
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(label);
    			if (detaching && label_outro) label_outro.end();
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(275:4) {#each payments.filter(t => t.done) as payment (payment.id)}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let div5;
    	let div0;
    	let input0;
    	let t0;
    	let div1;
    	let input1;
    	let input1_updating = false;
    	let t1;
    	let div2;
    	let input2;
    	let t2;
    	let div3;
    	let h20;
    	let t4;
    	let each_blocks_1 = [];
    	let each0_lookup = new Map();
    	let t5;
    	let div4;
    	let h21;
    	let t7;
    	let each_blocks = [];
    	let each1_lookup = new Map();
    	let t8;
    	let current;
    	let dispose;

    	function input1_input_handler() {
    		input1_updating = true;
    		/*input1_input_handler*/ ctx[19].call(input1);
    	}

    	let each_value_1 = /*payments*/ ctx[0].filter(func);
    	validate_each_argument(each_value_1);
    	const get_key = ctx => /*payment*/ ctx[24].id;
    	validate_each_keys(ctx, each_value_1, get_each_context_1$1, get_key);

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		let child_ctx = get_each_context_1$1(ctx, each_value_1, i);
    		let key = get_key(child_ctx);
    		each0_lookup.set(key, each_blocks_1[i] = create_each_block_1$1(key, child_ctx));
    	}

    	let each_value = /*payments*/ ctx[0].filter(func_1);
    	validate_each_argument(each_value);
    	const get_key_1 = ctx => /*payment*/ ctx[24].id;
    	validate_each_keys(ctx, each_value, get_each_context$1, get_key_1);

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context$1(ctx, each_value, i);
    		let key = get_key_1(child_ctx);
    		each1_lookup.set(key, each_blocks[i] = create_each_block$1(key, child_ctx));
    	}

    	const results_1_spread_levels = [/*calculate*/ ctx[3]()];
    	let results_1_props = {};

    	for (let i = 0; i < results_1_spread_levels.length; i += 1) {
    		results_1_props = assign(results_1_props, results_1_spread_levels[i]);
    	}

    	const results_1 = new Results({ props: results_1_props, $$inline: true });

    	const block = {
    		c: function create() {
    			div5 = element("div");
    			div0 = element("div");
    			input0 = element("input");
    			t0 = space();
    			div1 = element("div");
    			input1 = element("input");
    			t1 = space();
    			div2 = element("div");
    			input2 = element("input");
    			t2 = space();
    			div3 = element("div");
    			h20 = element("h2");
    			h20.textContent = "Vinieron";
    			t4 = space();

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t5 = space();
    			div4 = element("div");
    			h21 = element("h2");
    			h21.textContent = "Pagan";
    			t7 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t8 = space();
    			create_component(results_1.$$.fragment);
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "placeholder", "Nombre");
    			attr_dev(input0, "class", "svelte-1iv5a0i");
    			add_location(input0, file$2, 249, 4, 4899);
    			add_location(div0, file$2, 248, 2, 4889);
    			attr_dev(input1, "type", "number");
    			attr_dev(input1, "placeholder", "¿cuánto gastó?");
    			attr_dev(input1, "class", "svelte-1iv5a0i");
    			add_location(input1, file$2, 252, 4, 4981);
    			add_location(div1, file$2, 251, 2, 4971);
    			attr_dev(input2, "type", "button");
    			input2.value = "Agregar al listado";
    			attr_dev(input2, "class", "svelte-1iv5a0i");
    			add_location(input2, file$2, 255, 4, 5072);
    			add_location(div2, file$2, 254, 2, 5062);
    			attr_dev(h20, "class", "svelte-1iv5a0i");
    			add_location(h20, file$2, 259, 4, 5173);
    			attr_dev(div3, "class", "left svelte-1iv5a0i");
    			add_location(div3, file$2, 258, 2, 5150);
    			attr_dev(h21, "class", "svelte-1iv5a0i");
    			add_location(h21, file$2, 273, 4, 5615);
    			attr_dev(div4, "class", "right svelte-1iv5a0i");
    			add_location(div4, file$2, 272, 2, 5591);
    			attr_dev(div5, "class", "board svelte-1iv5a0i");
    			add_location(div5, file$2, 247, 0, 4867);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div5, anchor);
    			append_dev(div5, div0);
    			append_dev(div0, input0);
    			set_input_value(input0, /*name*/ ctx[1]);
    			append_dev(div5, t0);
    			append_dev(div5, div1);
    			append_dev(div1, input1);
    			set_input_value(input1, /*pay*/ ctx[2]);
    			append_dev(div5, t1);
    			append_dev(div5, div2);
    			append_dev(div2, input2);
    			append_dev(div5, t2);
    			append_dev(div5, div3);
    			append_dev(div3, h20);
    			append_dev(div3, t4);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(div3, null);
    			}

    			append_dev(div5, t5);
    			append_dev(div5, div4);
    			append_dev(div4, h21);
    			append_dev(div4, t7);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div4, null);
    			}

    			append_dev(div5, t8);
    			mount_component(results_1, div5, null);
    			current = true;

    			dispose = [
    				listen_dev(input0, "input", /*input0_input_handler*/ ctx[18]),
    				listen_dev(input1, "input", input1_input_handler),
    				listen_dev(input2, "click", /*add*/ ctx[6], false, false, false)
    			];
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*name*/ 2 && input0.value !== /*name*/ ctx[1]) {
    				set_input_value(input0, /*name*/ ctx[1]);
    			}

    			if (!input1_updating && dirty & /*pay*/ 4) {
    				set_input_value(input1, /*pay*/ ctx[2]);
    			}

    			input1_updating = false;

    			if (dirty & /*remove, payments*/ 129) {
    				const each_value_1 = /*payments*/ ctx[0].filter(func);
    				validate_each_argument(each_value_1);
    				group_outros();
    				for (let i = 0; i < each_blocks_1.length; i += 1) each_blocks_1[i].r();
    				validate_each_keys(ctx, each_value_1, get_each_context_1$1, get_key);
    				each_blocks_1 = update_keyed_each(each_blocks_1, dirty, get_key, 1, ctx, each_value_1, each0_lookup, div3, fix_and_outro_and_destroy_block, create_each_block_1$1, null, get_each_context_1$1);
    				for (let i = 0; i < each_blocks_1.length; i += 1) each_blocks_1[i].a();
    				check_outros();
    			}

    			if (dirty & /*remove, payments*/ 129) {
    				const each_value = /*payments*/ ctx[0].filter(func_1);
    				validate_each_argument(each_value);
    				group_outros();
    				for (let i = 0; i < each_blocks.length; i += 1) each_blocks[i].r();
    				validate_each_keys(ctx, each_value, get_each_context$1, get_key_1);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key_1, 1, ctx, each_value, each1_lookup, div4, fix_and_outro_and_destroy_block, create_each_block$1, null, get_each_context$1);
    				for (let i = 0; i < each_blocks.length; i += 1) each_blocks[i].a();
    				check_outros();
    			}

    			const results_1_changes = (dirty & /*calculate*/ 8)
    			? get_spread_update(results_1_spread_levels, [get_spread_object(/*calculate*/ ctx[3]())])
    			: {};

    			results_1.$set(results_1_changes);
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value_1.length; i += 1) {
    				transition_in(each_blocks_1[i]);
    			}

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			transition_in(results_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				transition_out(each_blocks_1[i]);
    			}

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			transition_out(results_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div5);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].d();
    			}

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}

    			destroy_component(results_1);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const func = t => !t.done;
    const func_1 = t => t.done;

    function instance$2($$self, $$props, $$invalidate) {
    	const [send, receive] = crossfade({
    		fallback(node, params) {
    			const style = getComputedStyle(node);
    			const transform = style.transform === "none" ? "" : style.transform;

    			return {
    				duration: 600,
    				easing: quintOut,
    				css: t => `
  					transform: ${transform} scale(${t});
  					opacity: ${t}
  				`
    			};
    		}
    	});

    	let payments = [];
    	let total;
    	let individualPayment = 0;
    	let name = "";
    	let pay;
    	let debtorss = [];
    	let credAccum;
    	let actualCreditorAmount;

    	payments = [
    		{
    			id: 1,
    			done: true,
    			name: "Bufarra",
    			pay: 40
    		},
    		{
    			id: 2,
    			done: true,
    			name: "Martin",
    			pay: 600
    		},
    		{
    			id: 3,
    			done: true,
    			name: "Joni",
    			pay: 150
    		},
    		{ id: 4, done: true, name: "Pedro", pay: 0 },
    		{ id: 5, done: true, name: "Cachi", pay: 0 },
    		{
    			id: 6,
    			done: true,
    			name: "Gisela",
    			pay: 200
    		},
    		{ id: 7, done: true, name: "Eze", pay: 0 }
    	];

    	let results = [
    		{
    			id: 2,
    			name: "Martin",
    			debtorss: [
    				{ id: 3, name: "Bufarra", pay: 101 },
    				{ id: 3, name: "Pedro", pay: 141 },
    				{ id: 3, name: "Cachi", pay: 141 },
    				{ id: 3, name: "Eze", pay: 76 }
    			]
    		},
    		{
    			name: "Gisela",
    			debtorss: [{ name: "Eze", pay: 54 }]
    		},
    		{
    			name: "Joni",
    			debtorss: [{ name: "Eze", pay: 11 }]
    		}
    	];

    	function add() {
    		let uid = payments.length + 1;
    		const payment = { id: uid++, done: false, name, pay };
    		$$invalidate(0, payments = [payment, ...payments]);
    	}

    	function remove(payment) {
    		$$invalidate(0, payments = payments.filter(t => t !== payment));
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<Form> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Form", $$slots, []);

    	function input0_input_handler() {
    		name = this.value;
    		$$invalidate(1, name);
    	}

    	function input1_input_handler() {
    		pay = to_number(this.value);
    		$$invalidate(2, pay);
    	}

    	function input_change_handler(payment) {
    		payment.done = this.checked;
    		$$invalidate(0, payments);
    	}

    	const click_handler = payment => remove(payment);

    	function input_change_handler_1(payment) {
    		payment.done = this.checked;
    		$$invalidate(0, payments);
    	}

    	const click_handler_1 = payment => remove(payment);

    	$$self.$capture_state = () => ({
    		quintOut,
    		crossfade,
    		flip,
    		Results,
    		send,
    		receive,
    		payments,
    		total,
    		individualPayment,
    		name,
    		pay,
    		debtorss,
    		credAccum,
    		actualCreditorAmount,
    		results,
    		add,
    		remove,
    		calculate,
    		prepareDataSet,
    		devideList,
    		collect,
    		toPay
    	});

    	$$self.$inject_state = $$props => {
    		if ("payments" in $$props) $$invalidate(0, payments = $$props.payments);
    		if ("total" in $$props) $$invalidate(8, total = $$props.total);
    		if ("individualPayment" in $$props) $$invalidate(9, individualPayment = $$props.individualPayment);
    		if ("name" in $$props) $$invalidate(1, name = $$props.name);
    		if ("pay" in $$props) $$invalidate(2, pay = $$props.pay);
    		if ("debtorss" in $$props) debtorss = $$props.debtorss;
    		if ("credAccum" in $$props) $$invalidate(10, credAccum = $$props.credAccum);
    		if ("actualCreditorAmount" in $$props) actualCreditorAmount = $$props.actualCreditorAmount;
    		if ("results" in $$props) results = $$props.results;
    		if ("calculate" in $$props) $$invalidate(3, calculate = $$props.calculate);
    		if ("prepareDataSet" in $$props) $$invalidate(12, prepareDataSet = $$props.prepareDataSet);
    		if ("devideList" in $$props) $$invalidate(13, devideList = $$props.devideList);
    		if ("collect" in $$props) $$invalidate(14, collect = $$props.collect);
    		if ("toPay" in $$props) $$invalidate(15, toPay = $$props.toPay);
    	};

    	let calculate;
    	let prepareDataSet;
    	let devideList;
    	let collect;
    	let toPay;

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*payments, total, individualPayment*/ 769) {
    			 $$invalidate(12, prepareDataSet = function () {
    				let payers = payments.filter(t => t.done);
    				$$invalidate(8, total = payers.reduce((a, b) => a + (b["pay"] || 0), 0));
    				$$invalidate(9, individualPayment = Math.round(total / payers.length));

    				return payers.map(payment => {
    					payment = {
    						...payment, //spread all props to new object except the one you need to change
    						pay: individualPayment - payment.pay
    					};

    					return payment;
    				});
    			});
    		}

    		if ($$self.$$.dirty & /*credAccum, individualPayment*/ 1536) {
    			 $$invalidate(15, toPay = function (debtor, creditor) {
    				$$invalidate(10, credAccum += debtor.pay);
    				let yetToPay = credAccum + creditor.pay;

    				if (yetToPay > 0 && yetToPay < individualPayment) {
    					let payment = debtor.pay - yetToPay;
    					debtor.pay = yetToPay;
    					creditor.pay += payment;
    					actualCreditorAmount = creditor.pay;
    				} else if (debtor.pay < individualPayment) {
    					debtor.pay = yetToPay;
    					creditor.pay += debtor.pay;
    					actualCreditorAmount = creditor.pay;
    				} else if (yetToPay <= 0) {
    					debtor.pay = yetToPay;
    					creditor.pay += debtor.pay;
    					actualCreditorAmount = individualPayment;
    				}
    			});
    		}

    		if ($$self.$$.dirty & /*toPay*/ 32768) {
    			 $$invalidate(14, collect = function (creditor, debtors) {
    				actualCreditorAmount = creditor.pay;
    				$$invalidate(10, credAccum = 0);
    				debtors.map(debtor => toPay(debtor, creditor));
    				return { ...creditor, debtors };
    			});
    		}

    		if ($$self.$$.dirty & /*prepareDataSet, devideList, collect, total, individualPayment*/ 29440) {
    			 $$invalidate(3, calculate = function () {
    				let balance = prepareDataSet();
    				let { creditors, debtors } = devideList(balance);
    				let result = creditors.map(cred => collect(cred, debtors));
    				console.log(result);
    				return { total, individualPayment, result };
    			});
    		}
    	};

    	 $$invalidate(13, devideList = function (balance) {
    		return {
    			creditors: balance.filter(e => e.pay < 0).sort((a, b) => a.pay > b.pay ? 1 : -1),
    			debtors: balance.filter(e => e.pay >= 0).sort((a, b) => a.pay > b.pay ? -1 : 1)
    		};
    	});

    	return [
    		payments,
    		name,
    		pay,
    		calculate,
    		send,
    		receive,
    		add,
    		remove,
    		total,
    		individualPayment,
    		credAccum,
    		actualCreditorAmount,
    		prepareDataSet,
    		devideList,
    		collect,
    		toPay,
    		debtorss,
    		results,
    		input0_input_handler,
    		input1_input_handler,
    		input_change_handler,
    		click_handler,
    		input_change_handler_1,
    		click_handler_1
    	];
    }

    class Form extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Form",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.19.2 */
    const file$3 = "src/App.svelte";

    // (17:1) {:else}
    function create_else_block(ctx) {
    	let h1;

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "Page Not Found";
    			add_location(h1, file$3, 17, 2, 345);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(17:1) {:else}",
    		ctx
    	});

    	return block;
    }

    // (14:22) 
    function create_if_block_1(ctx) {
    	let current;
    	const form = new Form({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(form.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(form, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(form.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(form.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(form, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(14:22) ",
    		ctx
    	});

    	return block;
    }

    // (12:1) {#if menu === 1}
    function create_if_block(ctx) {
    	let current;
    	const start = new Start({ $$inline: true });
    	start.$on("click", /*click_handler*/ ctx[1]);

    	const block = {
    		c: function create() {
    			create_component(start.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(start, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(start.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(start.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(start, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(12:1) {#if menu === 1}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let main;
    	let h1;
    	let a;
    	let t1;
    	let p;
    	let t3;
    	let current_block_type_index;
    	let if_block;
    	let current;
    	const if_block_creators = [create_if_block, create_if_block_1, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*menu*/ ctx[0] === 1) return 0;
    		if (/*menu*/ ctx[0] === 2) return 1;
    		return 2;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			main = element("main");
    			h1 = element("h1");
    			a = element("a");
    			a.textContent = "Repartija";
    			t1 = space();
    			p = element("p");
    			p.textContent = "No mas ebrios haciendo cuentas";
    			t3 = space();
    			if_block.c();
    			attr_dev(a, "href", "/");
    			add_location(a, file$3, 8, 5, 127);
    			add_location(h1, file$3, 8, 1, 123);
    			attr_dev(p, "class", "subtitle");
    			add_location(p, file$3, 9, 1, 159);
    			attr_dev(main, "class", "svelte-161625f");
    			add_location(main, file$3, 7, 0, 115);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, h1);
    			append_dev(h1, a);
    			append_dev(main, t1);
    			append_dev(main, p);
    			append_dev(main, t3);
    			if_blocks[current_block_type_index].m(main, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}

    				transition_in(if_block, 1);
    				if_block.m(main, null);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			if_blocks[current_block_type_index].d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { menu = 1 } = $$props;
    	const writable_props = ["menu"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);
    	const click_handler = () => $$invalidate(0, menu = 2);

    	$$self.$set = $$props => {
    		if ("menu" in $$props) $$invalidate(0, menu = $$props.menu);
    	};

    	$$self.$capture_state = () => ({ Start, Form, menu });

    	$$self.$inject_state = $$props => {
    		if ("menu" in $$props) $$invalidate(0, menu = $$props.menu);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [menu, click_handler];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { menu: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$3.name
    		});
    	}

    	get menu() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set menu(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const app = new App({
    	target: document.body,

    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
