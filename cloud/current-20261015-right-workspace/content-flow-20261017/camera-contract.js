export function applyRecoveredC02Camera(manifest,recovered){
 if(recovered.target_feedback_commit!=='79620ebe5d449f91519c70e2d4d6e9166366275d'||recovered.original_rig_sha256!=='47c653a0a7e7075bcb7b1b668429912ea4c7f8c1023a0c13f2d43b1ceedbb148')throw new Error('C02 camera provenance mismatch');
 const original=recovered.cameras.PREVIEW_ONLY_main,projection=original.projection_1672x941_rows;
 if(!projection?.flat().every(Number.isFinite)||original.shift_x!==0||original.shift_y!==0)throw new Error('Unsupported C02 camera projection');
 const c02=manifest.groups['c02-full'];
 c02.perspectiveFovDegrees=2*Math.atan(1/projection[1][1])*180/Math.PI;
 c02.near=original.clip_start;c02.far=original.clip_end;
 c02.sourceCamera={intrinsicsUnverified:false,source:'C02_original_camera_1672x941.json',rigSha256:recovered.original_rig_sha256,originalProjection:projection};
 return c02;
}
