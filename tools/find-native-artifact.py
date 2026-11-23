import json
import os
import subprocess

if os.environ.get('CI') != 'true':
    raise SystemExit('Artifact selection is CI-only.')
repository = os.environ['GITHUB_REPOSITORY']
expected = os.environ['PREVIEW_SHELL_KEY']

def api(endpoint):
    return json.loads(subprocess.check_output(['gh', 'api', f'repos/{repository}/{endpoint}']))

# GitHub caches are branch-scoped. Reuse verified build-job outputs from an
# ancestor in this same repository only when every native input hashes equally.
for run in api('actions/workflows/ci.yml/runs?status=success&per_page=30')['workflow_runs']:
    if run.get('head_repository', {}).get('full_name') != repository:
        continue
    sha = run['head_sha']
    if subprocess.run(['git', 'merge-base', '--is-ancestor', sha, os.environ['GITHUB_SHA']], capture_output=True).returncode:
        continue
    key = subprocess.check_output(['python3', 'tools/ci-scope.py', '--native-key-for-ref', sha], text=True).strip()
    if key != expected:
        continue
    artifacts = api(f'actions/runs/{run["id"]}/artifacts')['artifacts']
    names = {artifact['name'] for artifact in artifacts if not artifact['expired']}
    if not {'native-device-build-only', 'native-simulator-build-only'}.issubset(names):
        continue
    with open(os.environ['GITHUB_OUTPUT'], 'a') as output:
        output.write(f'run_id={run["id"]}\n')
    with open(os.environ['GITHUB_STEP_SUMMARY'], 'a') as summary:
        summary.write(f'Native artifacts reused across branches from run {run["id"]}, commit `{sha}`; all native source inputs match.\n')
    break
