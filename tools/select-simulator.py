import json
import os
import subprocess
import sys

if os.environ.get('CI') != 'true':
    raise SystemExit('Simulator selection is CI-only.')

runtime = os.environ['PREVIEW_SIMULATOR_RUNTIME']
device_type = os.environ['PREVIEW_SIMULATOR_DEVICE']
def simulator_json(arguments):
    # CoreSimulator's first request starts its service on a fresh hosted runner.
    # A timed-out client can leave that service warming up; retry the read once.
    for attempt in range(2):
        try:
            return json.loads(subprocess.check_output(['xcrun', 'simctl', *arguments, '--json'], timeout=90))
        except subprocess.TimeoutExpired:
            if attempt:
                raise
            print('CoreSimulator is still starting; retrying device discovery.', file=sys.stderr)

devices = simulator_json(['list', 'devices', 'available'])
types = simulator_json(['list', 'devicetypes'])
name = next(item['name'] for item in types['devicetypes'] if item['identifier'] == device_type)
candidates = [item for item in devices['devices'].get(runtime, []) if item.get('isAvailable')
              and (item.get('deviceTypeIdentifier') == device_type or item['name'] == name)]
if candidates:
    candidate = sorted(candidates, key=lambda item: item['state'] != 'Booted')[0]
    print('Reusing precreated simulator: ' + candidate['name'], file=sys.stderr)
    print(candidate['udid'])
else:
    print('No matching precreated device; creating simulator.', file=sys.stderr)
    print(subprocess.check_output(['xcrun', 'simctl', 'create', 'PreviewIntegration', device_type, runtime], text=True, timeout=60).strip())
