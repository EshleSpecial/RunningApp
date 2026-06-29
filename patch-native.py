#!/usr/bin/env python3
"""Run this from RunningApp/ after pod install to patch C++ incompatibilities."""
import subprocess, os, re

def patch(path, replacements):
    if not os.path.exists(path):
        print(f'  SKIP (not found): {path}')
        return
    os.chmod(path, 0o644)
    c = open(path).read()
    orig = c
    for old, new in replacements:
        c = c.replace(old, new)
    if c != orig:
        open(path, 'w').write(c)
        print(f'  PATCHED: {path}')
    else:
        print(f'  already ok: {path}')

print('=== 1. Folly Expected.h / Optional.h ===')
for name in ['Expected.h', 'Optional.h']:
    out = subprocess.run(['find', 'ios/Pods', '-name', name, '-path', '*/folly/*'],
                        capture_output=True, text=True).stdout.strip()
    for p in out.split('\n'):
        if not p: continue
        real = os.path.realpath(p)
        for f in set([p, real]):
            patch(f, [('#if FOLLY_HAS_COROUTINES', '#if 0 // patched: FOLLY_HAS_COROUTINES')])

print('\n=== 2. ReanimatedMountHook (Pods + node_modules) ===')
mount_patches = [
    ('UIManagerMountHookf', 'UIManagerMountHook'),
    ('double mountTime) noexcept override', 'HighResTimeStamp mountTime) noexcept override'),
    ('double mountTime) noexcept', 'HighResTimeStamp mountTime) noexcept'),
    ('double) noexcept', 'HighResTimeStamp) noexcept'),
]
for name in ['ReanimatedMountHook.h', 'ReanimatedMountHook.cpp']:
    out = subprocess.run(['find', 'ios/Pods', '-name', name],
                        capture_output=True, text=True).stdout.strip()
    for p in out.split('\n'):
        if not p: continue
        real = os.path.realpath(p)
        for f in set([p, real]):
            patch(f, mount_patches)
    nm = f'node_modules/react-native-reanimated/Common/cpp/reanimated/Fabric/{name}'
    patch(nm, mount_patches)

print('\n=== 3. NativeReanimatedModule.cpp shadowNodeFromValue shim ===')
nrm = 'node_modules/react-native-reanimated/Common/cpp/reanimated/NativeModules/NativeReanimatedModule.cpp'
if os.path.exists(nrm):
    os.chmod(nrm, 0o644)
    c = open(nrm).read()
    if 'shadowNodeFromValue was replaced' not in c:
        shim = '''
// RN 0.81 compat: shadowNodeFromValue was replaced by shadowNodeListFromValue
static inline facebook::react::ShadowNode::Shared shadowNodeFromValue(
    jsi::Runtime &rt, const jsi::Value &value) {
  auto list = facebook::react::shadowNodeListFromValue(rt, value);
  if (list && !list->empty()) return list->at(0);
  return nullptr;
}
'''
        idx = c.find('#ifdef RCT_NEW_ARCH_ENABLED')
        if idx != -1:
            eol = c.find('\n', idx)
            c = c[:eol+1] + shim + c[eol+1:]
            open(nrm, 'w').write(c)
            print(f'  PATCHED: {nrm}')
        else:
            # fallback: insert after last #include line
            last = c.rfind('\n#include')
            if last != -1:
                eol = c.find('\n', last + 1)
                c = c[:eol+1] + shim + c[eol+1:]
                open(nrm, 'w').write(c)
                print(f'  PATCHED (fallback): {nrm}')
            else:
                print(f'  ERROR: could not find insertion point in {nrm}')
    else:
        print(f'  already ok: {nrm}')
else:
    print(f'  SKIP (not found): {nrm}')

print('\n=== 4. LayoutAnimations parentShadowView → parentTag ===')
helper = '''
static inline facebook::react::ShadowView reanimated_parentShadowViewStub(facebook::react::Tag tag) {
  facebook::react::ShadowView sv{};
  sv.tag = tag;
  return sv;
}
'''
la_dir = 'node_modules/react-native-reanimated/Common/cpp/reanimated/LayoutAnimations'
for name in ['LayoutAnimationsUtils.cpp', 'LayoutAnimationsProxy.cpp']:
    f = os.path.join(la_dir, name)
    if not os.path.exists(f):
        print(f'  SKIP (not found): {f}')
        continue
    os.chmod(f, 0o644)
    c = open(f).read()
    orig = c
    c = c.replace('mutation.parentShadowView.layoutMetrics.frame.size.width', '0')
    c = c.replace('mutation.parentShadowView.layoutMetrics.frame.size.height', '0')
    c = c.replace('mutation.parentShadowView.tag', 'mutation.parentTag')
    c = re.sub(r'\b(InsertMutation|RemoveMutation)\(mutation\.parentShadowView,', r'\1(mutation.parentTag,', c)
    c = c.replace('mutation.newChildShadowView, *newView, mutation.parentShadowView)',
                  'mutation.newChildShadowView, *newView, mutation.parentTag)')
    c = c.replace('std::make_shared<ShadowView>(mutation.parentShadowView)',
                  'std::make_shared<ShadowView>(reanimated_parentShadowViewStub(mutation.parentTag))')
    c = c.replace('mutation.parentShadowView',
                  'reanimated_parentShadowViewStub(mutation.parentTag)')
    if c != orig:
        if 'reanimated_parentShadowViewStub(facebook::react::Tag' not in c:
            last = c.rfind('\n#include')
            if last != -1:
                eol = c.find('\n', last + 1)
                c = c[:eol+1] + helper + c[eol+1:]
        open(f, 'w').write(c)
        print(f'  PATCHED: {f}')
    else:
        print(f'  already ok: {f}')

print('\n=== 5. RNScreens parentShadowView ===')
rnscreens = 'ios/Pods/RNScreens/RNSScreenRemovalListener.cpp'
patch(rnscreens, [
    ('strcmp(mutation.parentShadowView.componentName, "RNSScreenStack") == 0', 'true'),
])

print('\nDone. Now run: npx expo run:ios --device')
