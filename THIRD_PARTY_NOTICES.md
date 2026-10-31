# Attribution and bundled assets

This application is derived from **Text to Handwriting**, Copyright (c) 2020 Saurabh Daware, licensed under MIT. The original [LICENSE](LICENSE) remains unchanged. Original rendering modules and a legacy test fixture remain in this repository.

The essential card workflow loads only same-origin assets. Font binaries are copied unchanged from the pinned npm packages during `npm run build`:

| Component | Version | Licence / notice |
| --- | --- | --- |
| html2canvas, Niklas von Hertzen | 1.0.0-rc.7 | MIT; original copyright header retained in `js/vendors/html2canvas.min.js` |
| docx, Dolan | 9.15.0 | [MIT](licenses/docx-MIT.txt) |
| fflate, Arjun Barrett | 0.8.3 | [MIT](licenses/fflate-MIT.txt) |
| nanoid, Andrey Sitnik | 6.0.2 | [MIT](licenses/nanoid-MIT.txt) |
| Caveat, The Caveat Project Authors | @fontsource/caveat 5.3.0 | [SIL OFL 1.1](licenses/Caveat-OFL.txt) |
| Homemade Apple, Font Diner / Google Fonts | @fontsource/homemade-apple 5.2.8 | [Apache 2.0](licenses/Homemade-Apple-Apache-2.0.txt) |
| Liu Jian Mao Cao, Google Inc. | @fontsource/liu-jian-mao-cao 5.2.7 | [SIL OFL 1.1](licenses/Liu-Jian-Mao-Cao-OFL.txt) |

Only unmodified Latin 400-normal WOFF2 font subsets are bundled for the new card workflow. The fonts retain their original licences; they are not relicensed under the application's MIT licence. Users uploading fonts must have appropriate usage rights. Custom font data is kept only in the current page session.

The legacy fixture also retains upstream assets and external-resource references, including jsPDF and the original Hindi font. It exists for regression coverage, is not part of the new main workflow, and is not an offline application. No new redistribution claim is made for those unchanged upstream assets. The original Hindi font is not copied into the new card bundle.
