import assert from "node:assert/strict";
import test from "node:test";

import { parseProfileView } from "@/lib/linkedin/parse/profile-view";
import { parseDashProfile } from "@/lib/linkedin/parse/dash";
import { describeDuration, parseDateRange, parseVectorImage } from "@/lib/linkedin/parse/helpers";
import { extractPublicId } from "@/lib/url";

import profileViewFixture from "./fixtures/profile-view.json" with { type: "json" };
import dashFixture from "./fixtures/dash-profile.json" with { type: "json" };

test("extractPublicId handles the URL shapes people actually paste", () => {
  const cases: [string, string][] = [
    ["https://www.linkedin.com/in/adalovelace/", "adalovelace"],
    ["https://www.linkedin.com/in/adalovelace", "adalovelace"],
    ["linkedin.com/in/adalovelace", "adalovelace"],
    ["https://in.linkedin.com/in/adalovelace?originalSubdomain=in", "adalovelace"],
    ["https://www.linkedin.com/in/AdaLovelace/", "adalovelace"],
    ["https://www.linkedin.com/in/ada-lovelace-123456/details/experience/", "ada-lovelace-123456"],
    ["adalovelace", "adalovelace"],
    ["  https://www.linkedin.com/in/adalovelace/  ", "adalovelace"],
  ];

  for (const [input, expected] of cases) {
    assert.equal(extractPublicId(input), expected, `failed on ${input}`);
  }
});

test("extractPublicId rejects things that are not personal profiles", () => {
  const bad = [
    "https://www.linkedin.com/company/anthropic",
    "https://www.linkedin.com/school/mit",
    "https://example.com/in/adalovelace",
    "https://www.linkedin.com/feed/",
    "",
  ];

  for (const input of bad) {
    assert.throws(() => extractPublicId(input), `should have rejected ${input}`);
  }
});

test("parseVectorImage stitches rootUrl to artifacts and picks the largest", () => {
  const image = parseVectorImage({
    "com.linkedin.common.VectorImage": {
      rootUrl: "https://media.licdn.com/dms/image/",
      artifacts: [
        { width: 100, height: 100, fileIdentifyingUrlPathSegment: "100_100/a" },
        { width: 800, height: 800, fileIdentifyingUrlPathSegment: "800_800/a" },
      ],
    },
  });

  assert.ok(image);
  assert.equal(image.url, "https://media.licdn.com/dms/image/800_800/a");
  assert.equal(image.variants.length, 2);
  assert.equal(parseVectorImage(null), null);
  assert.equal(parseVectorImage({ rootUrl: "x" }), null);
});

test("date ranges render text and mark ongoing roles as current", () => {
  const ongoing = parseDateRange({ startDate: { month: 3, year: 2019 } });
  assert.equal(ongoing.text, "Mar 2019 - Present");
  assert.equal(ongoing.isCurrent, true);

  const closed = parseDateRange({
    startDate: { month: 1, year: 2017 },
    endDate: { month: 2, year: 2019 },
  });
  assert.equal(closed.text, "Jan 2017 - Feb 2019");
  assert.equal(closed.isCurrent, false);
  assert.equal(describeDuration(closed), "2 yrs 2 mos");

  assert.equal(parseDateRange({ startDate: { year: 2013 }, endDate: { year: 2016 } }).text, "2013 - 2016");
  assert.equal(parseDateRange(undefined).text, null);
});

test("profileView parser maps every section", () => {
  const p = parseProfileView(profileViewFixture, "adalovelace");

  assert.equal(p.publicIdentifier, "adalovelace");
  assert.equal(p.profileUrl, "https://www.linkedin.com/in/adalovelace/");
  assert.equal(p.fullName, "Ada Lovelace");
  assert.equal(p.headline, "Analyst at the Analytical Engine Company");
  assert.equal(p.about, "Mathematician. Interested in symbolic computation.");
  assert.equal(p.industry, "Computer Software");
  assert.equal(p.location.text, "London, England, United Kingdom");
  assert.equal(p.location.country, "United Kingdom");
  assert.equal(p.memberId, "123456789");
  assert.equal(p.isInfluencer, true);

  assert.equal(p.profilePicture?.url, "https://media.licdn.com/dms/image/C4E03/profile/800_800/0/abc?e=1234&v=beta");
  assert.equal(p.profilePicture?.variants.length, 3);
  assert.ok(p.backgroundImage?.url.includes("1400_350"));

  assert.equal(p.experience.length, 2);
  const [current, previous] = p.experience;
  assert.equal(current.title, "Lead Analyst");
  assert.equal(current.employmentType, "Full time");
  assert.equal(current.company.name, "Analytical Engine Company");
  assert.equal(current.company.linkedinUrl, "https://www.linkedin.com/company/analytical-engine/");
  assert.equal(current.company.industry, "Computer Software");
  assert.equal(current.company.staffCountRange, "1001-5000");
  assert.ok(current.company.logo?.url.includes("company-logo"));
  assert.equal(current.dates.isCurrent, true);
  assert.equal(previous.duration, "2 yrs 2 mos");

  assert.equal(p.education[0].schoolName, "University of London");
  assert.equal(p.education[0].degree, "BSc");
  assert.equal(p.education[0].schoolLinkedinUrl, "https://www.linkedin.com/school/university-of-london/");

  assert.deepEqual(p.skills.map((s) => s.name), ["Algorithms", "Mathematics"]);
  assert.equal(p.certifications[0].authority, "Royal Society");
  assert.equal(p.languages[0].proficiency, "Native or bilingual");
  assert.equal(p.projects[0].title, "Note G");
  assert.equal(p.publications[0].publisher, "Taylor's Scientific Memoirs");
  assert.equal(p.honors[0].issuer, "Royal Society");
  assert.equal(p.volunteering[0].cause, "Science and technology");
  assert.equal(p.courses[0].number, "MATH301");
  assert.equal(p.organizations[0].position, "Member");
  assert.equal(p.patents[0].number, "GB1843");
  assert.equal(p.testScores[0].score, "336");
});

test("dash parser resolves urn references and ignores other people in `included`", () => {
  const p = parseDashProfile(dashFixture, "adalovelace");

  assert.equal(p.fullName, "Ada Lovelace");
  assert.equal(p.memberId, "123456789");
  assert.equal(p.location.text, "London, England, United Kingdom");
  assert.equal(p.industry, "Computer Software");
  assert.equal(p.isOpenToWork, true);
  assert.equal(p.isHiring, false);

  assert.equal(p.profilePicture?.url, "https://media.licdn.com/dms/image/C4E03/profile/800_800/0/abc?e=1&v=beta");

  assert.equal(p.experience.length, 1);
  assert.equal(p.experience[0].title, "Lead Analyst");
  assert.equal(p.experience[0].employmentType, "Full time");
  assert.equal(p.experience[0].company.name, "Analytical Engine Company");
  assert.equal(p.experience[0].company.linkedinUrl, "https://www.linkedin.com/company/analytical-engine/");
  assert.ok(p.experience[0].company.logo?.url.includes("company-logo"));
  assert.equal(p.experience[0].dates.isCurrent, true);

  assert.equal(p.education[0].schoolLinkedinUrl, "https://www.linkedin.com/school/university-of-london/");
  assert.equal(p.skills[0].name, "Algorithms");
  assert.equal(p.certifications[0].authority, "Royal Society");
  assert.equal(p.languages[0].proficiency, "Native or bilingual");
});

test("both parsers agree on the fields the two models share", () => {
  const legacy = parseProfileView(profileViewFixture, "adalovelace");
  const dash = parseDashProfile(dashFixture, "adalovelace");

  for (const key of ["fullName", "headline", "about", "industry", "memberId"] as const) {
    assert.equal(legacy[key], dash[key], `${key} diverged between parsers`);
  }
  assert.equal(legacy.location.text, dash.location.text);
  assert.equal(legacy.experience[0].title, dash.experience[0].title);
});
