# The account page

How Settings › SIGN IN / ACCOUNT (`web/src/v1ui/accountPage/`, CHG-0023) is laid out in each of its views, and
which v1 pieces it is drawn with. Moved here from the head of `accountPage.ts` (CHG-0045).

```
Settings › SIGN IN / ACCOUNT (CHG-0023, owner review 2026-11-15: in Settings beside ABOUT and DOWNLOAD, not in
Patches; the tab reads SIGN IN until you are signed in). Drawn into v1's Settings panel like the DOWNLOAD page, with v1
pieces only:
  signed out: v1 About's body type for the line, then Connect's GUIDE buttons (as wide as About's text), one a way to sign in (owner
              review 2: GOOGLE, APPLE, PASSKEY, in that order; Google and Apple only where the server offers them).
              CONTINUE WITH PASSKEY signs in with a passkey the device has; when none is chosen it asks for a name
              and makes the account (owner, 2026-11-17, CHG-0035: one button, as many sites do, not SIGN IN and
              CREATE ACCOUNT);
  naming:     a small heading in the tab type (no rule: owner review 2, it read as a text field), the Patches name
              field (a DOM field like v1's title) over its rule, the GUIDE button, a bordered BACK;
  signed in:  SIGNED IN AS NAME on one line in the tab type, the account's stats (R15, CHG-0027: numbers in the
              Settings sliders' large light type over mid-type labels, the favourite blocks as v1's menu icons over
              their names, as in the blocks menu), then half buttons (SIGN-IN METHODS · SIGN OUT), the ways this
              account signs in under them, and a bordered DELETE ACCOUNT, which asks first with CANCEL · DELETE;
  methods:    SIGN-IN METHODS (CHG-0039, owner 2026-11-19): the heading, a row per way in (its name, when it was
              added, a bordered REMOVE at the right while there is more than one; v1 Open's rows and rules), then
              the GUIDE buttons for ADD GOOGLE / ADD APPLE (those not linked yet) and ADD PASSKEY, and BACK. Under
              the ways in, APPS SIGNED IN: each plugin signed in to the account, with REMOVE (SHARING-0011);
  approve:    (website, `?link=CODE` from a plugin) "Sign in BlokDust on another device?", what asks and the code,
              CANCEL · APPROVE; with no code, the name field takes it;
  plugins:    (SHARING-0011) signed out, SIGN IN WITH YOUR BROWSER: the code large, the browser opened (the AUv3,
              which can't open one: a QR code of the address), waiting with v1's spinner, BACK. Signed in: the
              stats, then SIGN OUT (methods and deleting are the website's); signing in goes back to the stage.
```
