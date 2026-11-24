# Gjør Piper-modellen klar for nettleseren: en liten graf (.graph.onnx) + vektene som float16 (.weights.f16).
# Vektene lastes ned i halv størrelse (31 MB i stedet for 62 MB), og piper-worker.mjs gjør dem om til float32 før
# ONNX Runtime får dem som «external data». Lyden blir den samme, og minnebruken blir lavere enn med Cast-noder i grafen.
# Bruk: python3 fp16-weights.py no_NO-talesyntese-medium.onnx ../no_NO-talesyntese-medium
import os, sys
import numpy as np, onnx
from onnx import TensorProto

src, out = sys.argv[1], sys.argv[2]
name = os.path.basename(out)
model = onnx.load(src)
tmp = out + '.tmp'
os.makedirs(tmp, exist_ok=True)
onnx.save_model(model, f'{tmp}/graph.onnx', save_as_external_data=True, all_tensors_to_one_file=True, location=name + '.weights', size_threshold=1024)
graph = onnx.load(f'{tmp}/graph.onnx', load_external_data=False)
external = [t for t in graph.graph.initializer if t.data_location == TensorProto.EXTERNAL]
assert {t.data_type for t in external} == {TensorProto.FLOAT}, 'alle eksterne vekter må være float32'
weights = np.fromfile(f'{tmp}/{name}.weights', dtype=np.float32)
half = weights.astype(np.float16)
assert not np.isinf(half).any(), 'en vekt er for stor for float16'
half.tofile(out + '.weights.f16')
os.replace(f'{tmp}/graph.onnx', out + '.graph.onnx')
os.remove(f'{tmp}/{name}.weights'); os.rmdir(tmp)
print(f'{out}.graph.onnx ({os.path.getsize(out + ".graph.onnx")} B) + {out}.weights.f16 ({os.path.getsize(out + ".weights.f16")} B), '
      f'{len(external)} vekter, største avvik {float(np.max(np.abs(half.astype(np.float32) - weights))):.2e}')
