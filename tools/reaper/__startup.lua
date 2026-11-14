-- REAPER runs Scripts/__startup.lua at launch (Windows VM and macOS). Driven by <home>/blokdust-reaper-plan.txt,
-- written by reaper-smoke.ps1 (Windows) or `bd plugin reaper` (macOS, BLOKDUST_REAPER_HOME = an isolated folder);
-- without a plan it does nothing, so REAPER opened by hand is just REAPER.
-- Plan keys: fx (e.g. VST3i:BlokDust), seconds, mode = play | mpe | fx | state, quit = 1.
--   play:  add the plugin to a new track, open its window, play, sample the track peak.
--   mpe:   as play, plus a MIDI item: two notes on their own channels (MPE) with a per-note pitch bend and CC74.
--   fx:    a JS tone generator, then the plugin (BlokDust FX): its Audio In must carry the track's audio.
--   state: set Dust 1, save the project, reopen it: the plugin must come back with its patch and Dust 1 value.
-- Writes one JSON line to <home>/blokdust-reaper-report.json.
local sep = package.config:sub(1, 1)
local home = os.getenv("BLOKDUST_REAPER_HOME") or os.getenv("USERPROFILE") or os.getenv("HOME")
local marker = io.open(home .. sep .. "blokdust-startup-ran.txt", "w")
if marker then marker:write(reaper.GetAppVersion()); marker:close() end
local planFile = io.open(home .. sep .. "blokdust-reaper-plan.txt", "r")
if planFile == nil then return end
local plan = {}
for line in planFile:lines() do local k, v = line:match("^%s*(%w+)%s*=%s*(.-)%s*$"); if k then plan[k] = v end end
planFile:close()
os.remove(home .. sep .. "blokdust-reaper-plan.txt")

local seconds = tonumber(plan.seconds or "6")
local mode = plan.mode or "play"
reaper.InsertTrackAtIndex(0, true)
local track = reaper.GetTrack(0, 0)
local extra = ""
if mode == "fx" then reaper.TrackFX_AddByName(track, "JS: synthesis/tonegenerator", false, -1) end
local index = reaper.TrackFX_AddByName(track, plan.fx or "VST3i:BlokDust", false, -1)
local _, fxName = reaper.TrackFX_GetFXName(track, math.max(index, 0), "")
if index >= 0 then reaper.TrackFX_Show(track, index, 3) end

if mode == "mpe" then
  -- 4 s MIDI item; ppq at 960 per quarter, 120 BPM: 1 s = 1920 ticks. Notes on channels 2 and 3 (MPE members).
  local item = reaper.CreateNewMIDIItemInProj(track, 0, 4, false)
  local take = reaper.GetActiveTake(item)
  reaper.MIDI_InsertNote(take, false, false, 0, 7000, 1, 60, 110, true)
  reaper.MIDI_InsertNote(take, false, false, 0, 7000, 2, 67, 100, true)
  for i = 0, 10 do
    local ppq = 400 + i * 500
    local bend = 8192 + i * 300
    reaper.MIDI_InsertCC(take, false, false, ppq, 0xE0, 1, bend & 0x7F, (bend >> 7) & 0x7F, true)
    reaper.MIDI_InsertCC(take, false, false, ppq, 0xB0, 2, 74, 20 + i * 10, true)
  end
  reaper.MIDI_Sort(take)
  extra = ',"midiItem":true'
end

local function report(fields)
  local f = io.open(home .. sep .. "blokdust-reaper-report.json", "w")
  f:write(string.format('{"reaper":"%s","mode":"%s","loaded":%s,"fx":"%s"%s}\n',
    reaper.GetAppVersion(), mode, tostring(index >= 0), (fxName or ""):gsub('"', "'"), fields))
  f:close()
  if plan.quit == "1" then reaper.Main_OnCommand(40004, 0) end  -- File: Quit REAPER (project unsaved: no prompt in this setup)
end

if mode == "state" then
  reaper.TrackFX_SetParamNormalized(track, index, 0, 0.6)  -- Dust 1
  local path = home .. sep .. "blokdust-state.rpp"
  reaper.Main_SaveProjectEx(0, path, 0)
  reaper.Main_OnCommand(40859, 0)                  -- New project tab
  reaper.Main_openProject("noprompt:" .. path)
  local t2 = reaper.GetTrack(0, 0)
  local count = t2 and reaper.TrackFX_GetCount(t2) or 0
  local _, name2 = reaper.TrackFX_GetFXName(t2, 0, "")
  local dust = t2 and reaper.TrackFX_GetParamNormalized(t2, 0, 0) or -1
  local _, pname = reaper.TrackFX_GetParamName(t2, 0, 0, "")
  report(string.format(',"reopened":{"fxCount":%d,"fx":"%s","dust1":%.4f,"dust1Name":"%s"}', count, (name2 or ""):gsub('"', "'"), dust, (pname or ""):gsub('"', "'")))
  return
end

reaper.OnPlayButton()
local start = reaper.time_precise()
local peak = 0
local function finish()
  reaper.OnStopButton()
  report(string.format(',"peak":%.6f,"seconds":%d%s', peak, seconds, extra))
end
local function poll()
  peak = math.max(peak, reaper.Track_GetPeakInfo(track, 0), reaper.Track_GetPeakInfo(track, 1))
  if reaper.time_precise() - start < seconds then reaper.defer(poll) else finish() end
end
reaper.defer(poll)
